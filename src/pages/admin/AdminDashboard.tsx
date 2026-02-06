import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { Package, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";

const statusCounts = {
  new: { label: "New", icon: Package, color: "bg-primary/10 text-primary" },
  accepted: { label: "Accepted", icon: Clock, color: "bg-primary/10 text-primary" },
  scheduled: { label: "Scheduled", icon: Calendar, color: "bg-warning/10 text-warning" },
  collected: { label: "Collected", icon: CheckCircle, color: "bg-success/10 text-success" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-destructive/10 text-destructive" },
};

export default function AdminDashboard() {
  const [requests, setRequests] = useState<RequestWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("requests")
        .select("*, request_photos(*), profiles!requests_user_id_fkey(*)")
        .order("created_at", { ascending: false });

      setRequests((data as unknown as RequestWithPhotos[]) || []);
      setLoading(false);
    };

    fetchRequests();
  }, []);

  // Filter out archived requests for dashboard display
  const activeRequests = useMemo(() => 
    requests.filter((r) => !r.archived_at), 
    [requests]
  );

  // Calculate counts and recent requests (moved before hooks that depend on them)
  // Note: "collected" count includes both "collected" and "completed" statuses as they represent the same state
  // Archived requests are excluded from all counts
  const counts = useMemo(() => ({
    new: activeRequests.filter((r) => r.status === "new").length,
    accepted: activeRequests.filter((r) => r.status === "accepted").length,
    scheduled: activeRequests.filter((r) => r.status === "scheduled").length,
    collected: activeRequests.filter((r) => r.status === "collected" || r.status === "completed").length,
    cancelled: activeRequests.filter((r) => r.status === "cancelled").length,
  }), [activeRequests]);

  const recentRequests = useMemo(() => activeRequests.slice(0, 5), [activeRequests]);

  // Get thumbnail URLs for signed URL generation
  const thumbnailUrls = useMemo(() => 
    recentRequests.map(r => r.request_photos?.[0]?.file_url || null).filter((url): url is string => url !== null),
    [recentRequests]
  );

  // Use signed URLs for thumbnails - must be called before any early returns
  const { signedUrls, loading: urlsLoading } = useSignedUrls(thumbnailUrls);

  // Create a map from original URL to signed URL
  const signedUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    thumbnailUrls.forEach((url, index) => {
      if (signedUrls[index]) {
        map.set(url, signedUrls[index]!);
      }
    });
    return map;
  }, [thumbnailUrls, signedUrls]);

  // Early return for loading state - AFTER all hooks are called
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
      <div className="space-y-6 pt-12">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">Overview of collection requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
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
                      {(() => {
                        const firstPhotoUrl = request.request_photos?.[0]?.file_url;
                        const signedUrl = firstPhotoUrl ? signedUrlMap.get(firstPhotoUrl) : null;
                        
                        if (firstPhotoUrl && urlsLoading) {
                          return (
                            <div className="h-12 w-12 shrink-0 rounded-lg bg-[#28292b] flex items-center justify-center">
                              <LoadingSpinner size="sm" />
                            </div>
                          );
                        }
                        
                        if (firstPhotoUrl && signedUrl) {
                          return (
                            <img
                              src={signedUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          );
                        }
                        
                        return (
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-primary flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {request.profiles?.business_name?.charAt(0).toUpperCase() || "B"}
                            </span>
                          </div>
                        );
                      })()}
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
