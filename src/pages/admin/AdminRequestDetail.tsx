import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos, Profile } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Calendar, Package, Phone, Mail, Building2, User, Truck } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-primary/10", text: "text-primary", label: "New" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", label: "Scheduled" },
  collected: { bg: "bg-success/10", text: "text-success", label: "Collected" },
  completed: { bg: "bg-success/10", text: "text-success", label: "Completed" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
};

const windowLabels: Record<string, string> = {
  anytime: "Anytime",
  morning: "Morning (9am-12pm)",
  afternoon: "Afternoon (12pm-5pm)",
  evening: "Evening (5pm-8pm)",
};

const dayRangeLabels: Record<string, string> = {
  none: "No preference",
  tomorrow: "Tomorrow",
  "3_days": "Within 3 days",
  week: "Within a week",
};

// Extended type to include collected_by_name, cancelled_at, and cancellation fields
type RequestWithDriverName = RequestWithPhotos & {
  collected_by_name?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_name?: string | null;
  cancellation_reason?: string | null;
};

export default function AdminRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile: currentUserProfile } = useAuth();
  const [request, setRequest] = useState<RequestWithDriverName | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [schedulingUpdating, setSchedulingUpdating] = useState(false);
  const [driverUpdating, setDriverUpdating] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  
  // Scheduling state
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledStartTime, setScheduledStartTime] = useState<string>("");
  const [scheduledEndTime, setScheduledEndTime] = useState<string>("");

  // Cancellation state
  const [cancelledByName, setCancelledByName] = useState<string>("");
  const [cancellationReason, setCancellationReason] = useState<string>("");

  // Get original URLs from request photos
  const originalPhotoUrls = request?.request_photos?.map(p => p.file_url) || [];
  
  // Use signed URLs for private bucket access
  const { signedUrls, loading: urlsLoading } = useSignedUrls(originalPhotoUrls);

  // Determine if request is read-only (collected, completed, or cancelled)
  const isReadOnly = request?.status === 'collected' || request?.status === 'completed' || request?.status === 'cancelled';

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      // Fetch request and drivers in parallel
      const [requestResult, driversResult] = await Promise.all([
        supabase
          .from("requests")
          .select("*, request_photos(*), profiles!requests_user_id_fkey(*)")
          .eq("id", id)
          .single(),
        supabase
          .from("driver_invites")
          .select("profile_id, profiles!driver_invites_profile_id_fkey(*)")
          .eq("status", "completed")
          .not("profile_id", "is", null)
          .order("profiles(contact_name)"),
      ]);

      if (requestResult.error) {
        console.error("Error fetching request:", requestResult.error);
        navigate("/admin/requests", { replace: true });
        return;
      }

      const requestData = requestResult.data as unknown as RequestWithDriverName;
      // Extract profiles from the joined driver_invites result
      const driversList = (driversResult.data || [])
        .map((invite: any) => invite.profiles)
        .filter((profile: Profile | null): profile is Profile => profile !== null);
      
      // Check if assigned driver still exists
      const assignedDriverExists = requestData.assigned_driver_id 
        ? driversList.some(d => d.id === requestData.assigned_driver_id)
        : true;
      
      setRequest(requestData);
      setProfile(requestData.profiles as Profile);
      setNewStatus(requestData.status);
      // If driver was deleted, default to unassigned in the select
      setSelectedDriverId(assignedDriverExists ? (requestData.assigned_driver_id || "") : "");
      setDrivers(driversList);
      
      // Initialize scheduling fields
      if (requestData.scheduled_start) {
        const startDate = new Date(requestData.scheduled_start);
        setScheduledDate(format(startDate, "yyyy-MM-dd"));
        setScheduledStartTime(format(startDate, "HH:mm"));
      }
      if (requestData.scheduled_end) {
        const endDate = new Date(requestData.scheduled_end);
        setScheduledEndTime(format(endDate, "HH:mm"));
      }
      
      setLoading(false);
    };

    fetchData();
  }, [id, navigate]);

  const handleStatusUpdate = async () => {
    if (!request || newStatus === request.status) return;

    // Validate requirements for collected status
    if (newStatus === "collected") {
      if (!request.scheduled_start) {
        toast({ 
          variant: "destructive", 
          title: "Schedule required", 
          description: "Please schedule a collection date before marking as collected." 
        });
        return;
      }
      if (!request.assigned_driver_id) {
        toast({ 
          variant: "destructive", 
          title: "Driver required", 
          description: "Please assign a driver before marking as collected." 
        });
        return;
      }
    }

    // Validate requirements for cancelled status
    if (newStatus === "cancelled") {
      if (!cancelledByName.trim()) {
        toast({ 
          variant: "destructive", 
          title: "Customer name required", 
          description: "Please enter the name of the customer who requested cancellation." 
        });
        return;
      }
      if (!cancellationReason.trim()) {
        toast({ 
          variant: "destructive", 
          title: "Reason required", 
          description: "Please provide a reason for the cancellation." 
        });
        return;
      }
    }

    setUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      
      // Set accepted_at when status changes to accepted
      if (newStatus === "accepted" && request.status === "new") {
        updateData.accepted_at = new Date().toISOString();
      }

      // When marking as collected, also store the driver name
      if (newStatus === "collected" && request.assigned_driver_id) {
        const assignedDriver = drivers.find(d => d.id === request.assigned_driver_id);
        if (assignedDriver) {
          updateData.collected_by_name = assignedDriver.contact_name;
          updateData.collected_at = new Date().toISOString();
          updateData.collected_by = request.assigned_driver_id;
        }
      }

      // When marking as cancelled, store the cancellation details
      if (newStatus === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user?.id || null;
        updateData.cancelled_by_name = cancelledByName || null;
        updateData.cancellation_reason = cancellationReason || null;
      }
      
      const { error } = await supabase
        .from("requests")
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      setRequest({ ...request, ...updateData });
      toast({ title: "Status updated", description: `Request marked as ${statusConfig[newStatus].label}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } finally {
      setUpdating(false);
    }
  };

  const handleScheduleUpdate = async () => {
    if (!request) return;

    // Validate all required fields
    if (!scheduledDate) {
      toast({ 
        variant: "destructive", 
        title: "Date required", 
        description: "Please select a collection date." 
      });
      return;
    }
    if (!scheduledStartTime) {
      toast({ 
        variant: "destructive", 
        title: "Time required", 
        description: "Please select a start time." 
      });
      return;
    }
    if (!selectedDriverId && !request.assigned_driver_id) {
      toast({ 
        variant: "destructive", 
        title: "Driver required", 
        description: "Please assign a driver before scheduling." 
      });
      return;
    }

    setSchedulingUpdating(true);
    try {
      const scheduledStart = new Date(`${scheduledDate}T${scheduledStartTime}`);
      const scheduledEnd = scheduledEndTime 
        ? new Date(`${scheduledDate}T${scheduledEndTime}`)
        : null;

      const updateData: any = {
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd?.toISOString() || null,
      };

      // Also assign driver if one is selected but not yet saved
      if (selectedDriverId && selectedDriverId !== request.assigned_driver_id) {
        updateData.assigned_driver_id = selectedDriverId;
      }

      // Auto-set status to scheduled if currently accepted or new
      if (["new", "accepted"].includes(request.status)) {
        updateData.status = "scheduled";
        if (request.status === "new") {
          updateData.accepted_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from("requests")
        .update(updateData)
        .eq("id", request.id);

      if (error) throw error;

      setRequest({ ...request, ...updateData });
      if (updateData.status) {
        setNewStatus(updateData.status);
      }
      toast({ title: "Schedule updated", description: "Collection has been scheduled" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Scheduling failed", description: error.message });
    } finally {
      setSchedulingUpdating(false);
    }
  };

  const handleDriverAssignment = async () => {
    if (!request) return;

    setDriverUpdating(true);
    try {
      const assignedDriverId = selectedDriverId === "" ? null : selectedDriverId;
      
      const { error } = await supabase
        .from("requests")
        .update({ assigned_driver_id: assignedDriverId })
        .eq("id", request.id);

      if (error) throw error;

      setRequest({ ...request, assigned_driver_id: assignedDriverId });
      
      const driverName = drivers.find(d => d.id === assignedDriverId)?.contact_name;
      toast({ 
        title: assignedDriverId ? "Driver assigned" : "Driver unassigned", 
        description: assignedDriverId ? `Assigned to ${driverName}` : "Driver has been removed from this request"
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Assignment failed", description: error.message });
    } finally {
      setDriverUpdating(false);
    }
  };

  // Get suggested drivers based on postcode match
  const getSuggestedDrivers = () => {
    if (!profile?.postcode) return [];
    const postcodePrefix = profile.postcode.split(" ")[0].toUpperCase();
    return drivers.filter(driver => 
      driver.coverage_areas?.some(area => 
        postcodePrefix.startsWith(area) || area.startsWith(postcodePrefix)
      )
    );
  };

  const suggestedDrivers = getSuggestedDrivers();

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  if (!request || !profile) return null;

  const status = statusConfig[request.status] || statusConfig.new;

  return (
    <AdminLayout>
      {/* Photo Lightbox */}
      {selectedPhotoIndex !== null && signedUrls[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <img src={signedUrls[selectedPhotoIndex]} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/requests")}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Request Details</h1>
              <p className="text-sm text-gray-400">
                Submitted {format(new Date(request.created_at), "d MMMM yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Left Column - Request Info */}
          <div className="col-span-2 space-y-5">
            {/* Photos */}
            {request.request_photos && request.request_photos.length > 0 && (
              <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
                <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Photos ({request.request_photos.length})
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {request.request_photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className="aspect-square overflow-hidden rounded-lg border border-[#333]"
                      disabled={urlsLoading}
                    >
                      {urlsLoading ? (
                        <div className="h-full w-full flex items-center justify-center bg-[#28292b]">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : (
                        <img src={signedUrls[index] || ""} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Description</h3>
              </div>
              <p className="text-sm text-white leading-relaxed">{request.description}</p>
            </div>

            {/* Collection Preferences */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">Collection Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Preferred Window</p>
                    <p className="text-sm font-medium text-white">{windowLabels[request.preferred_window || "anytime"]}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Preferred Timeframe</p>
                    <p className="text-sm font-medium text-white">{dayRangeLabels[request.preferred_day_range || "none"]}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Business Info & Actions */}
          <div className="space-y-5">
          {/* Status Update */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                {isReadOnly ? "Status" : "Update Status"}
              </h3>
              {isReadOnly ? (
                <div className="space-y-3">
                  <div className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </div>
                  {request.status === 'cancelled' && (
                    <div className="space-y-2 pt-2 border-t border-[#333]">
                      {request.cancelled_at && (
                        <p className="text-xs text-gray-400">
                          <span className="font-medium text-white">Date:</span> {format(new Date(request.cancelled_at), "d MMM yyyy 'at' h:mm a")}
                        </p>
                      )}
                      {request.cancelled_by_name && (
                        <p className="text-xs text-gray-400">
                          <span className="font-medium text-white">Requested by:</span> {request.cancelled_by_name}
                        </p>
                      )}
                      {request.cancellation_reason && (
                        <div>
                          <p className="text-xs font-medium text-white mb-1">Reason:</p>
                          <p className="text-xs text-gray-400 leading-relaxed">{request.cancellation_reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {(request.status === 'collected' || request.status === 'completed') && request.collected_at && (
                    <p className="text-xs text-center text-gray-400">
                      Collected on {format(new Date(request.collected_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="bg-[#28292b] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Cancellation Details - Show when cancelled is selected */}
                  {newStatus === "cancelled" && request.status !== "cancelled" && (
                    <div className="space-y-3 pt-3 border-t border-[#333]">
                      <div>
                        <Label className="text-xs text-gray-400">Requested by (customer name)</Label>
                        <Input
                          value={cancelledByName}
                          onChange={(e) => setCancelledByName(e.target.value)}
                          placeholder="Enter customer name..."
                          className="mt-1 bg-[#28292b] border-[#333] text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">Reason for cancellation</Label>
                        <Textarea
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                          placeholder="Enter reason for cancellation..."
                          className="mt-1 bg-[#28292b] border-[#333] text-white min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updating || newStatus === request.status}
                    className="w-full"
                    variant={newStatus === "cancelled" ? "destructive" : "default"}
                  >
                    {updating ? <LoadingSpinner size="sm" /> : newStatus === "cancelled" ? "Confirm Cancellation" : "Update Status"}
                  </Button>
                </div>
              )}
            </div>

            {/* Schedule Collection - Hide for collected/completed */}
            {!isReadOnly && (
              <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Schedule Collection</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="schedule-date" className="text-xs text-gray-400 mb-1 block">Date</Label>
                    <Input
                      id="schedule-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="bg-[#28292b] border-[#333] text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="schedule-start" className="text-xs text-gray-400 mb-1 block">Start Time</Label>
                      <Input
                        id="schedule-start"
                        type="time"
                        value={scheduledStartTime}
                        onChange={(e) => setScheduledStartTime(e.target.value)}
                        className="bg-[#28292b] border-[#333] text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="schedule-end" className="text-xs text-gray-400 mb-1 block">End Time</Label>
                      <Input
                        id="schedule-end"
                        type="time"
                        value={scheduledEndTime}
                        onChange={(e) => setScheduledEndTime(e.target.value)}
                        className="bg-[#28292b] border-[#333] text-white"
                      />
                    </div>
                  </div>
                  {request.scheduled_start && (
                    <p className="text-xs text-gray-400">
                      Currently scheduled: {format(new Date(request.scheduled_start), "d MMM yyyy")}
                      {request.scheduled_end && (
                        <> ({format(new Date(request.scheduled_start), "h:mm a")} - {format(new Date(request.scheduled_end), "h:mm a")})</>
                      )}
                    </p>
                  )}
                  <Button
                    onClick={handleScheduleUpdate}
                    disabled={schedulingUpdating || !scheduledDate}
                    variant="secondary"
                    className="w-full"
                  >
                    {schedulingUpdating ? <LoadingSpinner size="sm" /> : "Update Schedule"}
                  </Button>
                </div>
              </div>
            )}

            {/* Assigned Driver - Read-only for collected, editable otherwise */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {isReadOnly ? "Collected By" : "Assign Driver"}
                </h3>
              </div>
              {isReadOnly ? (
                <div className="space-y-2">
                  {/* Show stored driver name for collected requests */}
                  {request.collected_by_name ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                        <User className="h-4 w-4 text-success" />
                      </div>
                      <p className="text-sm font-medium text-white">{request.collected_by_name}</p>
                    </div>
                  ) : drivers.find(d => d.id === request.assigned_driver_id) ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                        <User className="h-4 w-4 text-success" />
                      </div>
                      <p className="text-sm font-medium text-white">
                        {drivers.find(d => d.id === request.assigned_driver_id)?.contact_name}
                      </p>
                    </div>
                  ) : request.assigned_driver_id ? (
                    <p className="text-sm text-gray-400 italic">Driver no longer in system</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No driver assigned</p>
                  )}
                  {request.collected_at && (
                    <p className="text-xs text-gray-400">
                      Collected on {format(new Date(request.collected_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedDrivers.length > 0 && (
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-xs text-primary mb-2">Suggested for {profile?.postcode}:</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestedDrivers.map(driver => (
                          <button
                            key={driver.id}
                            onClick={() => setSelectedDriverId(driver.id)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              selectedDriverId === driver.id 
                                ? "bg-primary text-white" 
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          >
                            {driver.contact_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Select value={selectedDriverId || "unassigned"} onValueChange={(val) => setSelectedDriverId(val === "unassigned" ? "" : val)}>
                    <SelectTrigger className="bg-[#28292b] border-[#333] text-white">
                      <SelectValue placeholder="Select a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.contact_name}
                          {driver.coverage_areas && driver.coverage_areas.length > 0 && (
                            <span className="text-gray-400 ml-2">
                              ({driver.coverage_areas.slice(0, 3).join(", ")})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {request.assigned_driver_id && !drivers.find(d => d.id === request.assigned_driver_id) && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive p-3">
                      <p className="text-xs text-destructive font-medium">
                        ⚠️ Previously assigned driver has been deleted
                      </p>
                      <p className="text-xs text-destructive/70 mt-1">
                        Please assign a new driver to this request.
                      </p>
                    </div>
                  )}
                  {request.assigned_driver_id && drivers.find(d => d.id === request.assigned_driver_id) && (
                    <p className="text-xs text-gray-400">
                      Currently assigned: {drivers.find(d => d.id === request.assigned_driver_id)?.contact_name}
                    </p>
                  )}
                  <Button
                    onClick={handleDriverAssignment}
                    disabled={driverUpdating || selectedDriverId === (request.assigned_driver_id || "")}
                    variant="secondary"
                    className="w-full"
                  >
                    {driverUpdating ? <LoadingSpinner size="sm" /> : "Update Assignment"}
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">Business Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{profile.business_name}</p>
                    <p className="text-xs text-gray-400">Business</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{profile.contact_name}</p>
                    <p className="text-xs text-gray-400">Contact</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <a href={`tel:${profile.phone}`} className="text-sm font-medium text-primary hover:underline">{profile.phone}</a>
                    <p className="text-xs text-gray-400">Phone</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <a href={`mailto:${profile.email}`} className="text-sm font-medium text-primary hover:underline">{profile.email}</a>
                    <p className="text-xs text-gray-400">Email</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">Pickup Address</h3>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {profile.address_line1}
                    {profile.address_line2 && `, ${profile.address_line2}`}
                  </p>
                  <p className="text-sm text-white">{profile.city}, {profile.postcode}</p>
                  {profile.driver_notes && (
                    <p className="mt-2 text-xs text-gray-400">
                      <span className="font-medium">Notes:</span> {profile.driver_notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
