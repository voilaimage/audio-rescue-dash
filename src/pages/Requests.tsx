import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { ChevronRight, Package, ArrowLeft, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import appBg from "@/assets/app-bg.png";
import logo from "@/assets/logo-white.png";

const statusConfig: Record<string, {
  bg: string;
  text: string;
  label: string;
  canCancel: boolean;
}> = {
  new: {
    bg: "bg-primary/10",
    text: "text-primary",
    label: "New",
    canCancel: true
  },
  accepted: {
    bg: "bg-primary/10",
    text: "text-primary",
    label: "Accepted",
    canCancel: true
  },
  scheduled: {
    bg: "bg-warning/10",
    text: "text-warning",
    label: "Scheduled",
    canCancel: true
  },
  collected: {
    bg: "bg-success/10",
    text: "text-success",
    label: "Collected",
    canCancel: false
  },
  completed: {
    bg: "bg-success/10",
    text: "text-success",
    label: "Completed",
    canCancel: false
  },
  cancelled: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    label: "Cancelled",
    canCancel: false
  }
};

// Component for displaying request thumbnail with signed URL
function RequestThumbnail({ url, loading }: { url: string | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-14 w-14 shrink-0 rounded-lg bg-muted flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }
  
  if (!url) return null;
  
  return (
    <img 
      src={url} 
      alt="" 
      className="h-14 w-14 shrink-0 rounded-lg object-cover" 
    />
  );
}

export default function Requests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithPhotos | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Get first photo URL from each request for thumbnails
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

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const {
        data
      } = await supabase.from("requests").select("*, request_photos(*)").eq("user_id", user.id).order("created_at", {
        ascending: false
      });
      setRequests(data as RequestWithPhotos[] || []);
      setLoading(false);
    };
    fetchRequests();

    // Subscribe to realtime updates for user's requests
    const channel = supabase.channel('requests-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'requests',
      filter: `user_id=eq.${user.id}`
    }, async payload => {
      if (payload.eventType === 'INSERT') {
        // Fetch the new request with photos
        const {
          data
        } = await supabase.from("requests").select("*, request_photos(*)").eq("id", payload.new.id).single();
        if (data) {
          setRequests(prev => [data as RequestWithPhotos, ...prev]);
        }
      } else if (payload.eventType === 'UPDATE') {
        setRequests(prev => prev.map(req => req.id === payload.new.id ? {
          ...req,
          ...payload.new
        } : req));
      } else if (payload.eventType === 'DELETE') {
        setRequests(prev => prev.filter(req => req.id !== payload.old.id));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;
    
    setCancelling(true);
    try {
      const isNew = selectedRequest.status === 'new';
      
      if (isNew) {
        // Delete the request entirely if it's new (not yet processed)
        // First delete photos from storage
        if (selectedRequest.request_photos && selectedRequest.request_photos.length > 0) {
          const filePaths = selectedRequest.request_photos.map(photo => {
            const url = photo.file_url;
            const pathMatch = url.match(/request-photos\/(.+)$/);
            return pathMatch ? pathMatch[1] : null;
          }).filter(Boolean) as string[];
          
          if (filePaths.length > 0) {
            await supabase.storage.from('request-photos').remove(filePaths);
          }
        }
        
        // Delete the request (cascades to photos table)
        const { error } = await supabase
          .from('requests')
          .delete()
          .eq('id', selectedRequest.id);
          
        if (error) throw error;
        toast.success('Request deleted successfully');
      } else {
        // Cancel the request if it's already been processed
        const { error } = await supabase
          .from('requests')
          .update({ status: 'cancelled' })
          .eq('id', selectedRequest.id);
          
        if (error) throw error;
        toast.success('Request cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
      setSelectedRequest(null);
    }
  };

  const openCancelDialog = (e: React.MouseEvent, request: RequestWithPhotos) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRequest(request);
    setCancelDialogOpen(true);
  };

  if (loading) {
    return <MobileLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </MobileLayout>;
  }
  return <MobileLayout>
      <div className="h-full flex flex-col safe-top" style={{
      backgroundImage: `url(${appBg})`,
      backgroundSize: '100% 100%',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-5 pt-6">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => navigate("/home")} 
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 flex justify-center">
              <img src={logo} alt="Audio Salvage UK" className="h-16 w-auto" />
            </div>
            {/* Spacer to balance the layout */}
            <div className="w-10" />
          </div>

          <h1 className="mb-5 font-display text-white text-lg font-light">Past Requests</h1>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#555555] bg-[#1d1d1d] py-12 text-center">
              <Package className="mb-3 h-10 w-10 text-white" />
              <p className="text-sm text-white">No requests yet</p>
              <Link to="/new-request" className="mt-3 text-sm font-bold text-primary hover:underline">
                Create your first request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(request => {
                const status = statusConfig[request.status] || statusConfig.new;
                const firstPhotoUrl = request.request_photos?.[0]?.file_url;
                const signedUrl = firstPhotoUrl ? signedUrlMap.get(firstPhotoUrl) : null;
                
                return (
                  <div key={request.id} className="group relative">
                    <Link to={`/requests/${request.id}`} className="block">
                      <div className="rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card transition-all hover:border-primary/40">
                        <div className="flex gap-3">
                          {firstPhotoUrl && (
                            <RequestThumbnail 
                              url={signedUrl || null} 
                              loading={urlsLoading && !!firstPhotoUrl}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{request.description}</p>
                            <p className="mt-0.5 text-xs text-white">
                              {format(new Date(request.created_at), "d MMM yyyy")}
                            </p>
                            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {status.canCancel && (
                              <button
                                onClick={(e) => openCancelDialog(e, request)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                aria-label={request.status === 'new' ? 'Delete request' : 'Cancel request'}
                              >
                                {request.status === 'new' ? (
                                  <Trash2 className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <ChevronRight className="h-5 w-5 shrink-0 text-white transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cancel/Delete Confirmation Dialog */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="bg-[#1d1d1d] border-[#555555]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                {selectedRequest?.status === 'new' ? 'Delete Request?' : 'Cancel Request?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                {selectedRequest?.status === 'new' 
                  ? 'This will permanently delete this request and all associated photos. This action cannot be undone.'
                  : 'This will cancel your collection request. The team will be notified. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#2a2a2a] border-[#555555] text-white hover:bg-[#3a3a3a] hover:text-white">
                Go Back
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {cancelling ? (
                  <LoadingSpinner size="sm" />
                ) : selectedRequest?.status === 'new' ? (
                  'Delete'
                ) : (
                  'Cancel Request'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MobileLayout>;
}
