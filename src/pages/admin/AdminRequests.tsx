import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, ChevronRight, User, Archive, ArchiveRestore } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  new: { bg: "bg-primary/10", text: "text-primary", border: "border-primary", label: "New" },
  accepted: { bg: "bg-primary/10", text: "text-primary", border: "border-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", border: "border-warning", label: "Scheduled" },
  collected: { bg: "bg-success/10", text: "text-success", border: "border-success", label: "Collected" },
  completed: { bg: "bg-success/10", text: "text-success", border: "border-success", label: "Completed" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive", label: "Cancelled" },
};

type Driver = {
  id: string;
  contact_name: string;
};

type RequestWithArchive = RequestWithPhotos & {
  archived_at?: string | null;
};

export default function AdminRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithArchive[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch requests
      const { data: requestsData } = await supabase
        .from("requests")
        .select("*, request_photos(*), profiles!requests_user_id_fkey(*), assigned_driver:profiles!requests_assigned_driver_id_fkey(id, contact_name)")
        .order("created_at", { ascending: false });

      setRequests((requestsData as unknown as RequestWithArchive[]) || []);

      // Fetch drivers for filter
      const { data: driversData } = await supabase
        .from("profiles")
        .select("id, contact_name")
        .eq("role", "driver")
        .order("contact_name");

      setDrivers(driversData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Get thumbnail URLs for signed URL generation
  const thumbnailUrls = useMemo(() => 
    requests.map(r => r.request_photos?.[0]?.file_url || null).filter((url): url is string => url !== null),
    [requests]
  );

  // Use signed URLs for thumbnails
  const { signedUrls, loading: urlsLoading } = useSignedUrls(thumbnailUrls);

  // Create a map from original URL to signed URL for easy lookup
  const signedUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    thumbnailUrls.forEach((url, index) => {
      if (signedUrls[index]) {
        map.set(url, signedUrls[index]!);
      }
    });
    return map;
  }, [thumbnailUrls, signedUrls]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    requests.forEach((r) => {
      if (r.profiles?.city) citySet.add(r.profiles.city);
    });
    return Array.from(citySet).sort();
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Archive filter - by default hide archived, show only archived when toggled
      const isArchived = !!request.archived_at;
      if (showArchived && !isArchived) return false;
      if (!showArchived && isArchived) return false;

      // Status filter
      if (statusFilter !== "all" && request.status !== statusFilter) return false;

      // City filter
      if (cityFilter !== "all" && request.profiles?.city !== cityFilter) return false;

      // Driver filter
      if (driverFilter !== "all") {
        if (driverFilter === "unassigned" && request.assigned_driver_id) return false;
        if (driverFilter !== "unassigned" && request.assigned_driver_id !== driverFilter) return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const requestDate = new Date(request.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dateFilter === "today" && daysDiff > 0) return false;
        if (dateFilter === "week" && daysDiff > 7) return false;
        if (dateFilter === "month" && daysDiff > 30) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBusiness = request.profiles?.business_name?.toLowerCase().includes(query);
        const matchesDescription = request.description.toLowerCase().includes(query);
        const matchesCity = request.profiles?.city?.toLowerCase().includes(query);
        const matchesPostcode = request.profiles?.postcode?.toLowerCase().includes(query);
        if (!matchesBusiness && !matchesDescription && !matchesCity && !matchesPostcode) return false;
      }

      return true;
    });
  }, [requests, statusFilter, cityFilter, driverFilter, dateFilter, searchQuery, showArchived]);

  // Archive/unarchive handler
  const handleArchiveToggle = async (requestId: string, isCurrentlyArchived: boolean) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({ archived_at: isCurrentlyArchived ? null : new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, archived_at: isCurrentlyArchived ? null : new Date().toISOString() }
          : r
      ));

      toast({ 
        title: isCurrentlyArchived ? "Request unarchived" : "Request archived",
        description: isCurrentlyArchived ? "Request has been restored" : "Request has been moved to archive"
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action failed", description: error.message });
    }
  };

  // Count archived requests
  const archivedCount = useMemo(() => 
    requests.filter(r => !!r.archived_at).length, 
    [requests]
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-white">All Requests</h1>
          <p className="text-sm text-gray-400">
            {filteredRequests.length} of {requests.length} requests
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search business, description, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#1d1d1d] border-[#333] text-white placeholder:text-gray-500"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[160px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-[160px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>{driver.contact_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Archive Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className={`bg-[#1d1d1d] border-[#333] ${
              showArchived 
                ? "border-primary bg-primary/10 text-primary hover:bg-primary hover:text-white hover:border-primary" 
                : "text-white hover:bg-[#2a2a2a] hover:border-[#444] hover:text-white"
            }`}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? "Viewing Archived" : `Archive (${archivedCount})`}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333] bg-black/30">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  Driver
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const status = statusConfig[request.status] || statusConfig.new;
                  const firstPhotoUrl = request.request_photos?.[0]?.file_url;
                  const signedUrl = firstPhotoUrl ? signedUrlMap.get(firstPhotoUrl) : null;
                    return (
                      <tr key={request.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {firstPhotoUrl && urlsLoading ? (
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-[#28292b] flex items-center justify-center">
                                <LoadingSpinner size="sm" />
                              </div>
                            ) : firstPhotoUrl && signedUrl ? (
                              <img
                                src={signedUrl}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {request.profiles?.business_name?.charAt(0).toUpperCase() || "B"}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">
                                {request.profiles?.business_name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {request.profiles?.contact_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-[200px] truncate text-sm text-white">
                            {request.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{request.profiles?.city}</p>
                          <p className="text-xs text-gray-400">{request.profiles?.postcode}</p>
                        </td>
                        <td className="px-4 py-3">
                          {request.assigned_driver ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm text-white">
                                {request.assigned_driver.contact_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">
                            {format(new Date(request.created_at), "d MMM yyyy")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(request.created_at), "h:mm a")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text} ${status.border}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Archive/Unarchive button - only for collected, completed, or cancelled */}
                            {(request.status === 'collected' || request.status === 'completed' || request.status === 'cancelled') && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleArchiveToggle(request.id, !!request.archived_at);
                                }}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                  request.archived_at 
                                    ? "bg-success/20 text-success hover:bg-success/30" 
                                    : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                                }`}
                                title={request.archived_at ? "Unarchive" : "Archive"}
                              >
                                {request.archived_at ? (
                                  <ArchiveRestore className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <Link
                              to={`/admin/requests/${request.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
