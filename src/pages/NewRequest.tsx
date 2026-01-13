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
import { ArrowLeft, Camera, X, Check, MapPin } from "lucide-react";

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
      const { data: request, error: requestError } = await supabase
        .from("requests")
        .insert({
          user_id: user.id,
          description,
          preferred_window: preferredWindow as "anytime" | "morning" | "afternoon" | "evening",
          preferred_day_range: preferredDayRange as "none" | "tomorrow" | "3_days" | "week",
        })
        .select()
        .single();

      if (requestError) throw requestError;

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
      <div className="px-5 py-5 safe-top">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">New Collection Request</h1>
            <p className="text-xs text-muted-foreground">Step {step} of 2</p>
          </div>
          {/* Progress */}
          <div className="flex gap-1.5">
            <div className={`h-1.5 w-6 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 w-6 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </div>

        {step === 1 && (
          <div className="animate-fade-in space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Photos (1-10 required)</Label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
              
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removePhoto(i)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <button onClick={() => fileInputRef.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </button>
                )}
              </div>
            </div>

            <Button onClick={() => photos.length > 0 && setStep(2)} disabled={photos.length === 0} className="w-full touch-target font-semibold">
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the equipment (brand, model, condition, issues)..." rows={4} className="resize-none" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred Collection Window</Label>
              <Select value={preferredWindow} onValueChange={setPreferredWindow}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">Anytime</SelectItem>
                  <SelectItem value="morning">Morning (9am-12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm-8pm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Preferred Day Range</Label>
              <Select value={preferredDayRange} onValueChange={setPreferredDayRange}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="3_days">Within 3 days</SelectItem>
                  <SelectItem value="week">Within a week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pickup Address</p>
                  <p className="mt-0.5 text-sm text-foreground">
                    {profile?.address_line1}{profile?.address_line2 && `, ${profile.address_line2}`}
                  </p>
                  <p className="text-sm text-foreground">{profile?.city}, {profile?.postcode}</p>
                </div>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={!description || loading} className="w-full touch-target font-semibold">
              {loading ? <LoadingSpinner size="sm" /> : <><Check className="mr-2 h-4 w-4" /> Submit Request</>}
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
