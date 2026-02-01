import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { supabase, RequestWithPhotos, Profile } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Clock, Package, Phone, User, FileText, Camera, Calendar } from "lucide-react";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", label: "Scheduled" },
  collected: { bg: "bg-success/10", text: "text-success", label: "Collected" },
};

export default function DriverJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestWithPhotos | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // Get original URLs from request photos
  const originalPhotoUrls = request?.request_photos?.map((p) => p.file_url) || [];

  // Use signed URLs for private bucket access
  const { signedUrls, loading: urlsLoading } = useSignedUrls(originalPhotoUrls);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, request_photos(*), profiles!requests_user_id_fkey(*)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching request:", error);
        navigate("/driver", { replace: true });
        return;
      }

      const requestData = data as unknown as RequestWithPhotos;
      setRequest(requestData);
      setProfile(requestData.profiles as Profile);
      setLoading(false);
    };

    fetchRequest();
  }, [id, navigate]);

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </DriverLayout>
    );
  }

  if (!request || !profile) return null;

  const status = statusConfig[request.status] || statusConfig.accepted;
  const canMarkCollected = request.status === "accepted" || request.status === "scheduled";

  return (
    <DriverLayout>
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

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver")}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Job Details</h1>
              <p className="text-sm text-gray-400">
                {request.scheduled_start
                  ? format(new Date(request.scheduled_start), "d MMMM yyyy")
                  : "Not scheduled"}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Left Column - Customer Photos */}
          <div className="col-span-2 space-y-5">
            {/* Customer Photos */}
            {request.request_photos && request.request_photos.length > 0 && (
              <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Customer Photos ({request.request_photos.length})
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {request.request_photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className="aspect-square overflow-hidden rounded-lg border border-[#333]"
                      disabled={urlsLoading}
                    >
                      {urlsLoading ? (
                        <div className="h-full w-full flex items-center justify-center bg-[#28292b]">
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
          </div>

          {/* Right Column - Pickup Details & Job Info */}
          <div className="space-y-5">
            {/* Mark as Collected Button */}
            {canMarkCollected && (
              <Button
                onClick={() => navigate(`/driver/job/${id}/collect`)}
                className="w-full h-12 text-base font-semibold"
              >
                Mark as Collected
              </Button>
            )}

            {/* Business Info */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                Pickup Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{profile.business_name}</p>
                    <p className="text-xs text-gray-400">{profile.contact_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <a
                      href={`tel:${profile.phone}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {profile.phone}
                    </a>
                    <p className="text-xs text-gray-400">Tap to call</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduled Collection */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Scheduled Collection
                </h3>
              </div>
              {request.scheduled_start ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-white" />
                    <p className="text-sm font-semibold text-white">
                      {format(new Date(request.scheduled_start), "EEEE, d MMMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-white" />
                    <p className="text-sm font-medium text-white">
                      {format(new Date(request.scheduled_start), "h:mm a")}
                      {request.scheduled_end && (
                        <span className="text-gray-400"> – {format(new Date(request.scheduled_end), "h:mm a")}</span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-400">Not yet scheduled by admin</p>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                Pickup Address
              </h3>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {profile.address_line1}
                    {profile.address_line2 && `, ${profile.address_line2}`}
                  </p>
                  <p className="text-sm text-white">
                    {profile.city}, {profile.postcode}
                  </p>
                </div>
              </div>
            </div>

            {/* Driver Notes */}
            {profile.driver_notes && (
              <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Driver Notes
                  </h3>
                </div>
                <p className="text-sm text-white leading-relaxed">{profile.driver_notes}</p>
              </div>
            )}

            {/* Request Description */}
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Request Description
                </h3>
              </div>
              <p className="text-sm text-white leading-relaxed">{request.description}</p>
            </div>
          </div>
        </div>
      </div>
    </DriverLayout>
  );
}
