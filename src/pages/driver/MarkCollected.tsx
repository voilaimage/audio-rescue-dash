import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, X, Upload, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MarkCollected() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<RequestWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [proofPhotos, setProofPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, request_photos(*)")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching request:", error);
        navigate("/driver", { replace: true });
        return;
      }

      // Check if request can be marked as collected
      if (!["accepted", "scheduled"].includes(data.status)) {
        toast({
          variant: "destructive",
          title: "Cannot collect",
          description: "This request is not in a collectable state.",
        });
        navigate("/driver", { replace: true });
        return;
      }

      setRequest(data as unknown as RequestWithPhotos);
      setLoading(false);
    };

    fetchRequest();
  }, [id, navigate, toast]);

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files) return;

    const newPhotos = Array.from(files).slice(0, 5 - proofPhotos.length);
    if (newPhotos.length === 0) return;

    // Create preview URLs
    const newPreviewUrls = newPhotos.map((file) => URL.createObjectURL(file));

    setProofPhotos((prev) => [...prev, ...newPhotos]);
    setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setProofPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!request || !user) return;

    // Validation
    if (proofPhotos.length === 0) {
      toast({
        variant: "destructive",
        title: "Proof photo required",
        description: "Please add at least one proof photo.",
      });
      return;
    }

    // PIN validation if required
    if (request.collection_pin && pin !== request.collection_pin) {
      setPinError("Incorrect PIN. Please try again.");
      return;
    }
    setPinError("");

    setSubmitting(true);

    try {
      // Upload proof photos
      const uploadedUrls: string[] = [];
      for (const photo of proofPhotos) {
        const fileName = `${request.id}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("collection-proofs")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("collection-proofs")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      // Insert proof photos to table
      if (uploadedUrls.length > 0) {
        const proofPhotoRecords = uploadedUrls.map((url) => ({
          request_id: request.id,
          file_url: url,
        }));

        const { error: insertError } = await supabase
          .from("collection_proof_photos")
          .insert(proofPhotoRecords);

        if (insertError) throw insertError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("requests")
        .update({
          status: "collected",
          collected_at: new Date().toISOString(),
          collected_by: user.id,
          collection_notes: collectionNotes || null,
          collection_proof_photo_url: uploadedUrls[0] || null,
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/driver");
      }, 2000);
    } catch (error: any) {
      console.error("Error marking collected:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to mark as collected.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </DriverLayout>
    );
  }

  if (success) {
    return (
      <DriverLayout>
        <div className="flex h-96 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/20">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Collection Marked as Collected
          </h2>
          <p className="text-gray-400">Redirecting to jobs list...</p>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/driver/job/${id}`)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Mark as Collected</h1>
            <p className="text-sm text-gray-400">Upload proof and confirm collection</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Proof Photos */}
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
            <Label className="text-sm font-medium text-white mb-3 block">
              Proof Photo <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-gray-400 mb-4">
              Take a photo of the collected items as proof
            </p>

            {/* Photo Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={url}
                    alt={`Proof ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover border border-[#333]"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {proofPhotos.length < 5 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#333] bg-[#28292b] hover:border-primary hover:bg-[#333] transition-colors">
                      <Camera className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-400">Add Photo</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => cameraInputRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => galleryInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Photo Gallery
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoSelect(e.target.files)}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Collection Notes */}
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
            <Label htmlFor="notes" className="text-sm font-medium text-white mb-3 block">
              Collection Notes <span className="text-gray-400">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Any notes about the collection..."
              value={collectionNotes}
              onChange={(e) => setCollectionNotes(e.target.value)}
              className="bg-[#28292b] border-[#333] text-white placeholder:text-gray-500 min-h-[100px]"
            />
          </div>

          {/* PIN Entry (if required) */}
          {request?.collection_pin && (
            <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-5">
              <Label htmlFor="pin" className="text-sm font-medium text-white mb-3 block">
                Collection PIN <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-gray-400 mb-4">
                Enter the 4-digit PIN provided by the customer
              </p>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setPinError("");
                }}
                className={`bg-[#28292b] border-[#333] text-white placeholder:text-gray-500 text-center text-2xl tracking-widest ${
                  pinError ? "border-destructive" : ""
                }`}
              />
              {pinError && <p className="text-sm text-destructive mt-2">{pinError}</p>}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || proofPhotos.length === 0}
            className="w-full h-12 text-base font-semibold"
          >
            {submitting ? <LoadingSpinner size="sm" /> : "Submit"}
          </Button>
        </div>
      </div>
    </DriverLayout>
  );
}
