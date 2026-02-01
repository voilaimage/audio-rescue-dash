import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Calendar, Package } from "lucide-react";
import appBg from "@/assets/app-bg.png";
import logo from "@/assets/logo-white.png";

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

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [request, setRequest] = useState<RequestWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Get original URLs from request photos
  const originalPhotoUrls = request?.request_photos?.map(p => p.file_url) || [];
  
  // Use signed URLs for private bucket access
  const { signedUrls, loading: urlsLoading } = useSignedUrls(originalPhotoUrls);

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

    // Subscribe to realtime updates for this specific request
    const channel = supabase
      .channel(`request-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'requests',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setRequest(prev => prev ? { ...prev, ...payload.new } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      {selectedPhotoIndex !== null && signedUrls[selectedPhotoIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <img
            src={signedUrls[selectedPhotoIndex]}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}

      <div 
        className="h-full flex flex-col safe-top"
        style={{
          backgroundImage: `url(${appBg})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b border-border/50 bg-black px-5 py-4">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Audio Salvage UK" className="h-16 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/requests")}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold text-white">Request Details</h1>
              <p className="text-xs text-primary">
                {format(new Date(request.created_at), "d MMMM yyyy 'at' h:mm a")}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-24 space-y-5">
          {/* Photos Gallery */}
          {request.request_photos && request.request_photos.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Photos ({request.request_photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {request.request_photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="aspect-square overflow-hidden rounded-lg border border-border"
                    disabled={urlsLoading}
                  >
                    {urlsLoading ? (
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : (
                      <img
                        src={signedUrls[index] || ""}
                        alt=""
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    )}
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
              {/* Requested */}
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-xs">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Requested</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), "d MMM yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {/* Accepted */}
              {(request.accepted_at || ['accepted', 'scheduled', 'collected', 'completed'].includes(request.status)) && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Accepted</p>
                    <p className="text-xs text-muted-foreground">
                      {request.accepted_at 
                        ? format(new Date(request.accepted_at), "d MMM yyyy 'at' h:mm a")
                        : "Status updated"}
                    </p>
                  </div>
                </div>
              )}

              {/* Scheduled */}
              {request.scheduled_start && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/20 text-warning">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Scheduled</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.scheduled_start), "d MMM yyyy")}
                      {request.scheduled_end && (
                        <> – {format(new Date(request.scheduled_end), "h:mm a")}</>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Collected */}
              {request.collected_at && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info/20 text-info">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Collected</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.collected_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Completed */}
              {request.status === 'completed' && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20 text-success">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Completed</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.updated_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {request.status === 'cancelled' && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                    <span className="text-xs">✗</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Cancelled</p>
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
