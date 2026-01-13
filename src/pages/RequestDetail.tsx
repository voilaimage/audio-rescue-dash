import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Calendar, Package } from "lucide-react";

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

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [request, setRequest] = useState<RequestWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, request_photos(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching request:", error);
        navigate("/requests", { replace: true });
        return;
      }

      setRequest(data as RequestWithPhotos);
      setLoading(false);
    };

    fetchRequest();
  }, [id, navigate]);

  if (loading) {
    return (
      <MobileLayout showNav={false}>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  if (!request) {
    return null;
  }

  const status = statusConfig[request.status] || statusConfig.new;

  return (
    <MobileLayout showNav={false}>
      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      <div className="safe-top">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/requests")}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold text-foreground">Request Details</h1>
              <p className="text-xs text-muted-foreground">
                {format(new Date(request.created_at), "d MMMM yyyy 'at' h:mm a")}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Photos Gallery */}
          {request.request_photos && request.request_photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Photos ({request.request_photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {request.request_photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo.file_url)}
                    className="aspect-square overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={photo.file_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </h3>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{request.description}</p>
          </div>

          {/* Collection Preferences */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Collection Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Window</p>
                  <p className="text-sm font-medium text-foreground">
                    {windowLabels[request.preferred_window || "anytime"]}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Timeframe</p>
                  <p className="text-sm font-medium text-foreground">
                    {dayRangeLabels[request.preferred_day_range || "none"]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Address */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pickup Address
            </h3>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {profile?.address_line1}
                  {profile?.address_line2 && `, ${profile.address_line2}`}
                </p>
                <p className="text-sm text-foreground">
                  {profile?.city}, {profile?.postcode}
                </p>
                {profile?.driver_notes && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Driver notes:</span> {profile.driver_notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-xs">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Request Submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), "d MMM yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              {request.status !== "new" && (
                <div className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${status.bg} ${status.text}`}>
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{status.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.updated_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
