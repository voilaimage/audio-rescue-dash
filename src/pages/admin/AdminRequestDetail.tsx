import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos, Profile } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Calendar, Package, Phone, Mail, Building2, User } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-primary/10", text: "text-primary", label: "New" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", label: "Scheduled" },
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

export default function AdminRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [request, setRequest] = useState<RequestWithPhotos | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  // Get original URLs from request photos
  const originalPhotoUrls = request?.request_photos?.map(p => p.file_url) || [];
  
  // Use signed URLs for private bucket access
  const { signedUrls, loading: urlsLoading } = useSignedUrls(originalPhotoUrls);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, request_photos(*), profiles(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching request:", error);
        navigate("/admin/requests", { replace: true });
        return;
      }

      const requestData = data as RequestWithPhotos;
      setRequest(requestData);
      setProfile(requestData.profiles as Profile);
      setNewStatus(requestData.status);
      setLoading(false);
    };

    fetchRequest();
  }, [id, navigate]);

  const handleStatusUpdate = async () => {
    if (!request || newStatus === request.status) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: newStatus as any })
        .eq("id", request.id);

      if (error) throw error;

      setRequest({ ...request, status: newStatus as any });
      toast({ title: "Status updated", description: `Request marked as ${statusConfig[newStatus].label}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } finally {
      setUpdating(false);
    }
  };

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
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
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
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">Update Status</h3>
              <div className="space-y-3">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-[#28292b] border-[#333] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating || newStatus === request.status}
                  className="w-full"
                >
                  {updating ? <LoadingSpinner size="sm" /> : "Update Status"}
                </Button>
              </div>
            </div>

            {/* Business Info */}
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
