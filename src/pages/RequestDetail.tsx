import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { cacheRequestDetail, getCachedRequestDetail, getRequestDetailCacheTimestamp } from "@/lib/offline-storage";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Calendar, Package, WifiOff, RefreshCw } from "lucide-react";
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
  const [isOffline, setIsOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Get original URLs from request photos
  const originalPhotoUrls = request?.request_photos?.map(p => p.file_url) || [];
  
  // Use signed URLs for private bucket access
  const { signedUrls, loading: urlsLoading } = useSignedUrls(originalPhotoUrls);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      // Try to load cached data first for instant display
      const cachedData = await getCachedRequestDetail(id);
      const cachedTimestamp = await getRequestDetailCacheTimestamp(id);
      if (cachedData) {
        setRequest(cachedData);
        setLastSynced(cachedTimestamp);
        setLoading(false);
      }

      // Then fetch fresh data from the server
      try {
        const { data, error } = await supabase
          .from("requests")
          .select("*, request_photos(*)")
          .eq("id", id)
          .single();

        if (error) throw error;

        setRequest(data as RequestWithPhotos);
        setIsOffline(false);
        
        // Cache the fresh data for offline use
        await cacheRequestDetail(id, data);
        setLastSynced(Date.now());
      } catch (error) {
        console.error("Failed to fetch request:", error);
        // If we have cached data, show offline indicator
        if (request || cachedData) {
          setIsOffline(true);
          if (!request && cachedData) {
            setRequest(cachedData);
          }
        } else {
          // No cached data and fetch failed - navigate back
          navigate("/requests", { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();

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
        async (payload) => {
          const updatedRequest = request ? { ...request, ...payload.new } : null;
          setRequest(updatedRequest as RequestWithPhotos);
          // Update cache with realtime changes
          if (updatedRequest) {
            await cacheRequestDetail(id, updatedRequest);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const syncRequestDetail = useCallback(async () => {
    if (!id || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*, request_photos(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      setRequest(data as RequestWithPhotos);
      setIsOffline(false);
      
      await cacheRequestDetail(id, data);
      setLastSynced(Date.now());
    } catch (error) {
      console.error("Failed to refresh request:", error);
      setIsOffline(true);
    } finally {
      setIsSyncing(false);
    }
  }, [id, isSyncing]);

  const handleManualRefresh = () => syncRequestDetail();

  // Auto-sync when coming back online
  useOnlineStatus({
    onReconnect: () => {
      console.log("Network restored, syncing request detail...");
      toast.info("Back online - syncing data...");
      syncRequestDetail();
    },
  });

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
          
          {/* Sync Status */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {lastSynced && (
                <span className="text-xs text-white/50">
                  Synced {formatDistanceToNow(lastSynced, { addSuffix: true })}
                </span>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={isSyncing}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
                aria-label="Refresh request"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {isOffline && (
              <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-1.5 text-xs text-warning">
                <WifiOff className="h-3.5 w-3.5" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content with Pull-to-Refresh */}
        <PullToRefresh
          onRefresh={syncRequestDetail}
          disabled={isSyncing}
          className="flex-1 px-5 py-5 pb-24 space-y-5"
        >
          {/* Photos Gallery */}
          {request.request_photos && request.request_photos.length > 0 && (
            <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                Photos ({request.request_photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {request.request_photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="aspect-square overflow-hidden rounded-lg border border-[#555555] bg-[#2a2a2a]"
                    disabled={urlsLoading}
                  >
                    {urlsLoading ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                      </div>
                    ) : signedUrls[index] ? (
                      <img
                        src={signedUrls[index]}
                        alt=""
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white/40">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#f59f0a]" />
              <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
                Description
              </h3>
            </div>
            <p className="text-sm text-white leading-relaxed">{request.description}</p>
          </div>

          {/* Collection Preferences */}
          <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
              Collection Preferences
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f59f0a]">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/60">Preferred Window</p>
                  <p className="text-sm font-medium text-white">
                    {windowLabels[request.preferred_window || "anytime"]}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f59f0a]">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/60">Preferred Timeframe</p>
                  <p className="text-sm font-medium text-white">
                    {dayRangeLabels[request.preferred_day_range || "none"]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pickup Address */}
          <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
              Pickup Address
            </h3>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f59f0a]">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {profile?.address_line1}
                  {profile?.address_line2 && `, ${profile.address_line2}`}
                </p>
                <p className="text-sm text-white">
                  {profile?.city}, {profile?.postcode}
                </p>
                {profile?.driver_notes && (
                  <p className="mt-2 text-xs text-white/60">
                    <span className="font-medium">Driver notes:</span> {profile.driver_notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-white/60">
              Timeline
            </h3>
            <div className="space-y-3">
              {/* Requested */}
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f59f0a] text-white">
                  <span className="text-xs">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Requested</p>
                  <p className="text-xs text-white/60">
                    {format(new Date(request.created_at), "d MMM yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {/* Accepted */}
              {(request.accepted_at || ['accepted', 'scheduled', 'collected', 'completed'].includes(request.status)) && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f59f0a]/30 text-[#f59f0a]">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Accepted</p>
                    <p className="text-xs text-white/60">
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
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f59f0a]/30 text-[#f59f0a]">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Scheduled</p>
                    <p className="text-xs text-white/60">
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
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-400">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Collected</p>
                    <p className="text-xs text-white/60">
                      {format(new Date(request.collected_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Completed */}
              {request.status === 'completed' && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/30 text-emerald-400">
                    <span className="text-xs">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Completed</p>
                    <p className="text-xs text-white/60">
                      {format(new Date(request.updated_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {request.status === 'cancelled' && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/30 text-red-400">
                    <span className="text-xs">✗</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Cancelled</p>
                    <p className="text-xs text-white/60">
                      {format(new Date(request.updated_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PullToRefresh>
      </div>
    </MobileLayout>
  );
}
