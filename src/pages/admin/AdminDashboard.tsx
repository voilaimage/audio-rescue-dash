import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { Package, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";

const statusCounts = {
  new: { label: "New", icon: Package, color: "bg-primary/10 text-primary" },
  accepted: { label: "Accepted", icon: Clock, color: "bg-primary/10 text-primary" },
  scheduled: { label: "Scheduled", icon: Calendar, color: "bg-warning/10 text-warning" },
  completed: { label: "Completed", icon: CheckCircle, color: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-destructive/10 text-destructive" },
};

export default function AdminDashboard() {
  const [requests, setRequests] = useState<RequestWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  const counts = {
    new: requests.filter((r) => r.status === "new").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    scheduled: requests.filter((r) => r.status === "scheduled").length,
    completed: requests.filter((r) => r.status === "completed").length,
    cancelled: requests.filter((r) => r.status === "cancelled").length,
  };

  const recentRequests = requests.slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Overview of collection requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(statusCounts).map(([key, { label, icon: Icon, color }]) => (
            <div
              key={key}
              className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-white">{counts[key as keyof typeof counts]}</p>
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Recent Requests */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d]">
          <div className="flex items-center justify-between border-b border-[#333] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-white">Recent Requests</h2>
            <Link to="/admin/requests" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[#333]">
            {recentRequests.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                No requests yet
              </div>
            ) : (
              recentRequests.map((request) => {
                const statusInfo = statusCounts[request.status];
                  return (
                    <Link
                      key={request.id}
                      to={`/admin/requests/${request.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                    >
                      {request.request_photos?.[0] && (
                        <img
                          src={request.request_photos[0].file_url}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {request.profiles?.business_name || "Unknown Business"}
                        </p>
                        <p className="truncate text-sm text-gray-400">{request.description}</p>
                      </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                        <p className="mt-1 text-xs text-gray-400">
                          {format(new Date(request.created_at), "d MMM")}
                        </p>
                      </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
