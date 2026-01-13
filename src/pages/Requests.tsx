import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronRight, Package } from "lucide-react";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  accepted: "bg-primary/20 text-primary border-primary/30",
  scheduled: "bg-warning/20 text-warning border-warning/30",
  completed: "bg-success/20 text-success border-success/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
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
      <div className="px-6 py-8 safe-top">
        <h1 className="mb-6 font-display text-2xl font-bold">Past Requests</h1>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No requests yet</p>
            <Link to="/new-request" className="mt-4 text-primary hover:underline">
              Create your first request
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Link key={request.id} to={`/requests/${request.id}`} className="block">
                <div className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-muted-foreground/30">
                  <div className="flex gap-4">
                    {request.request_photos?.[0] && (
                      <img
                        src={request.request_photos[0].file_url}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{request.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.created_at), "d MMM yyyy")}
                      </p>
                      <Badge variant="outline" className={`mt-2 ${statusColors[request.status]}`}>
                        {request.status}
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
