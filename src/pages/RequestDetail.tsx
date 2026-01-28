import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Calendar, Package, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import appBg from "@/assets/app-bg.png";
import logo from "@/assets/logo-white.png";

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
  const { toast } = useToast();
  const [request, setRequest] = useState<RequestWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeletePhoto = async (photoIndex: number) => {
    if (!request?.request_photos?.[photoIndex]) return;
    
    const photo = request.request_photos[photoIndex];
    setDeleting(true);
    
    try {
      // Extract file path from the URL
      const urlParts = photo.file_url.split('/request-photos/');
      const filePath = urlParts[1];
      
      // Delete from storage
      if (filePath) {
        await supabase.storage.from('request-photos').remove([filePath]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('request_photos')
        .delete()
        .eq('id', photo.id);
      
      if (error) throw error;
      
      // Update local state
      setRequest(prev => {
        if (!prev) return prev;
        const updatedPhotos = prev.request_photos?.filter((_, i) => i !== photoIndex) || [];
        return { ...prev, request_photos: updatedPhotos };
      });
      
      // Close lightbox if no more photos or adjust index
      if ((request.request_photos?.length || 0) <= 1) {
        setSelectedPhotoIndex(null);
      } else if (photoIndex >= (request.request_photos?.length || 0) - 1) {
        setSelectedPhotoIndex(Math.max(0, photoIndex - 1));
      }
      
      toast({
        title: "Photo deleted",
        description: "The photo has been removed from this request."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete photo",
        description: error.message
      });
    } finally {
      setDeleting(false);
    }
  };

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPhotoIndex(null);
          }}
        >
          {/* Close button */}
          <button 
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Previous button */}
          {(request.request_photos?.length || 0) > 1 && (
            <button 
              onClick={() => setSelectedPhotoIndex((selectedPhotoIndex - 1 + (request.request_photos?.length || 1)) % (request.request_photos?.length || 1))}
              className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={signedUrls[selectedPhotoIndex]}
            alt=""
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />

          {/* Next button */}
          {(request.request_photos?.length || 0) > 1 && (
            <button 
              onClick={() => setSelectedPhotoIndex((selectedPhotoIndex + 1) % (request.request_photos?.length || 1))}
              className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Delete button */}
          <button 
            onClick={() => handleDeletePhoto(selectedPhotoIndex)}
            disabled={deleting}
            className="absolute bottom-6 z-10 flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-white hover:bg-destructive/90 disabled:opacity-50"
          >
            {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? "Deleting..." : "Delete Photo"}
          </button>

          {/* Photo counter */}
          {(request.request_photos?.length || 0) > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-sm text-white">
              {selectedPhotoIndex + 1} / {request.request_photos?.length}
            </div>
          )}
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
        <div className="flex-shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-md px-5 py-4">
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
              <p className="text-xs text-muted-foreground">
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
