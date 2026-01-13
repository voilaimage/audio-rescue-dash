import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, ChevronRight } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-primary/10", text: "text-primary", label: "New" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", label: "Scheduled" },
  completed: { bg: "bg-success/10", text: "text-success", label: "Completed" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
};

export default function AdminRequests() {
  const [requests, setRequests] = useState<RequestWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("requests")
        .select("*, request_photos(*), profiles(*)")
        .order("created_at", { ascending: false });

      setRequests((data as RequestWithPhotos[]) || []);
      setLoading(false);
    };

    fetchRequests();
  }, []);

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
      // Status filter
      if (statusFilter !== "all" && request.status !== statusFilter) return false;

      // City filter
      if (cityFilter !== "all" && request.profiles?.city !== cityFilter) return false;

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
  }, [requests, statusFilter, cityFilter, dateFilter, searchQuery]);

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
              <SelectItem value="completed">Completed</SelectItem>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const status = statusConfig[request.status] || statusConfig.new;
                    return (
                      <tr key={request.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {request.request_photos?.[0] && (
                              <img
                                src={request.request_photos[0].file_url}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
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
                          <p className="text-sm text-white">
                            {format(new Date(request.created_at), "d MMM yyyy")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(request.created_at), "h:mm a")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/requests/${request.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
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
