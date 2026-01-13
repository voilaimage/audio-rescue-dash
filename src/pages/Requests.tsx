import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronRight, Package } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-primary/10", text: "text-primary", label: "New" },
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", label: "Scheduled" },
  completed: { bg: "bg-success/10", text: "text-success", label: "Completed" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", label: "Cancelled" },
};

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("requests")
        .select("*, request_photos(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      setRequests((data as RequestWithPhotos[]) || []);
      setLoading(false);
    };

    fetchRequests();
  }, [user]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-5 py-6 safe-top">
        <h1 className="mb-5 font-display text-2xl font-bold text-foreground">Past Requests</h1>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No requests yet</p>
            <Link to="/new-request" className="mt-3 text-sm font-medium text-primary hover:underline">
              Create your first request
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.new;
              return (
                <Link key={request.id} to={`/requests/${request.id}`} className="block">
                  <div className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-muted-foreground/30">
                    <div className="flex gap-3">
                      {request.request_photos?.[0] && (
                        <img
                          src={request.request_photos[0].file_url}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{request.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "d MMM yyyy")}
                        </p>
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
