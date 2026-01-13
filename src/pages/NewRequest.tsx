import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ArrowLeft, Camera, X, Upload, Check, MapPin } from "lucide-react";

type Step = 1 | 2;

export default function NewRequest() {
  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("anytime");
  const [preferredDayRange, setPreferredDayRange] = useState("none");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 10) {
      toast({ variant: "destructive", title: "Maximum 10 photos allowed" });
      return;
    }
    
    const newPhotos = [...photos, ...files].slice(0, 10);
    setPhotos(newPhotos);
    
    const newPreviews = newPhotos.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      // Create request
      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          user_id: user.id,
          description,
          preferred_window: preferredWindow,
          preferred_day_range: preferredDayRange,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Upload photos
      for (const photo of photos) {
        const fileName = `${user.id}/${request.id}/${Date.now()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("request-photos")
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("request-photos")
          .getPublicUrl(fileName);

        await supabase.from("request_photos").insert({
          request_id: request.id,
          file_url: publicUrl,
        });
      }

      toast({ title: "Request submitted!", description: "We'll be in touch soon." });
      navigate("/requests", { replace: true });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to submit", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout showNav={false}>
      <div className="px-6 py-6 safe-top">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold">New Collection Request</h1>
            <p className="text-sm text-muted-foreground">Step {step} of 2</p>
          </div>
        </div>

        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="space-y-4">
              <Label>Photos (1-10 required)</Label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
              
              <div className="grid grid-cols-3 gap-3">
                {previews.map((preview, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-border">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removePhoto(i)} className="absolute right-1 top-1 rounded-full bg-background/80 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <button onClick={() => fileInputRef.current?.click()} className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            <Button onClick={() => photos.length > 0 && setStep(2)} disabled={photos.length === 0} className="w-full touch-target">
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the equipment..." rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Preferred Collection Window</Label>
              <Select value={preferredWindow} onValueChange={setPreferredWindow}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">Anytime</SelectItem>
                  <SelectItem value="morning">Morning (9am-12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm-8pm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred Day Range</Label>
              <Select value={preferredDayRange} onValueChange={setPreferredDayRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="3_days">Within 3 days</SelectItem>
                  <SelectItem value="week">Within a week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Pickup Address</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.address_line1}, {profile?.city}, {profile?.postcode}
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={!description || loading} className="w-full touch-target">
              {loading ? <LoadingSpinner size="sm" /> : <><Check className="mr-2 h-4 w-4" /> Submit Request</>}
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
