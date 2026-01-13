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
import { ArrowLeft, Camera, X, Check, MapPin, ImageIcon, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { PinchZoomImage } from "@/components/PinchZoomImage";
import appBg from "@/assets/app-bg.png";
import logo from "@/assets/logo-white.png";
type Step = 1 | 2;
export default function NewRequest() {
  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("anytime");
  const [preferredDayRange, setPreferredDayRange] = useState("none");
  const [loading, setLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  const navigate = useNavigate();
  const {
    profile,
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 10) {
      toast({
        variant: "destructive",
        title: "Maximum 10 photos allowed"
      });
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
      const {
        data: request,
        error: requestError
      } = await supabase.from("requests").insert({
        user_id: user.id,
        description,
        preferred_window: preferredWindow as "anytime" | "morning" | "afternoon" | "evening",
        preferred_day_range: preferredDayRange as "none" | "tomorrow" | "3_days" | "week"
      }).select().single();
      if (requestError) throw requestError;
      for (const photo of photos) {
        const fileName = `${user.id}/${request.id}/${Date.now()}-${photo.name}`;
        const {
          error: uploadError
        } = await supabase.storage.from("request-photos").upload(fileName, photo);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from("request-photos").getPublicUrl(fileName);
        await supabase.from("request_photos").insert({
          request_id: request.id,
          file_url: publicUrl
        });
      }
      toast({
        title: "Request submitted!",
        description: "We'll be in touch soon."
      });
      navigate("/requests", {
        replace: true
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to submit",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  return <MobileLayout showNav={false}>
      <div className="min-h-screen px-5 py-5 safe-top" style={{
      backgroundImage: `url(${appBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
        {/* Logo */}
        <div className="mt-8 mb-4 flex justify-center">
          <img src={logo} alt="Audio Salvage UK" className="h-16 w-auto" />
        </div>

        {/* Title */}
        <h1 className="mt-4 mb-6 text-center text-white text-lg font-light">New Collection Request</h1>

        {/* Navigation & Progress */}
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-sm text-white">Step {step} of 2</p>
          <div className="flex gap-1.5">
            {[1, 2].map(s => <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-muted"}`} />)}
          </div>
        </div>

        {step === 1 && <div className="animate-fade-in space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Photos (1-10 required)</Label>
              {/* Camera input - opens camera directly */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoSelect} className="hidden" />
              {/* Gallery input - opens photo gallery */}
              <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
              
              <div className="grid grid-cols-3 gap-2">
                {previews.map((preview, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                    <button 
                      onClick={() => { setPreviewIndex(i); setPreviewOpen(true); }}
                      className="h-full w-full"
                    >
                      <img src={preview} alt="" className="h-full w-full object-cover" />
                    </button>
                    <button onClick={() => removePhoto(i)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < 10 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white bg-[#1d1d1d] hover:border-primary hover:bg-primary/5">
                        <Camera className="h-6 w-6 text-white" />
                        <span className="text-xs text-white">Add</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-[#1d1d1d] border-[#555555]">
                      <DropdownMenuItem 
                        onClick={() => cameraInputRef.current?.click()}
                        className="text-white focus:bg-[#28292b] focus:text-white cursor-pointer"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => galleryInputRef.current?.click()}
                        className="text-white focus:bg-[#28292b] focus:text-white cursor-pointer"
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Photo Gallery
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <Button onClick={() => photos.length > 0 && setStep(2)} disabled={photos.length === 0} className="w-full touch-target font-semibold">
              Continue
            </Button>

            {/* Photo Preview Modal */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 bg-black/95 border-none">
                <div className="relative flex items-center justify-center min-h-[60vh]">
                  {/* Close button */}
                  <button 
                    onClick={() => setPreviewOpen(false)}
                    className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Previous button */}
                  {previews.length > 1 && (
                    <button 
                      onClick={() => setPreviewIndex((previewIndex - 1 + previews.length) % previews.length)}
                      className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  )}

                  {/* Image with pinch-to-zoom and swipe */}
                  <PinchZoomImage
                    src={previews[previewIndex]} 
                    alt={`Photo ${previewIndex + 1}`} 
                    className="flex items-center justify-center"
                    onSwipeLeft={() => previews.length > 1 && setPreviewIndex((previewIndex + 1) % previews.length)}
                    onSwipeRight={() => previews.length > 1 && setPreviewIndex((previewIndex - 1 + previews.length) % previews.length)}
                  />

                  {/* Next button */}
                  {previews.length > 1 && (
                    <button 
                      onClick={() => setPreviewIndex((previewIndex + 1) % previews.length)}
                      className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button 
                    onClick={() => {
                      removePhoto(previewIndex);
                      if (previews.length <= 1) {
                        setPreviewOpen(false);
                      } else if (previewIndex >= previews.length - 1) {
                        setPreviewIndex(Math.max(0, previewIndex - 1));
                      }
                    }}
                    className="absolute bottom-4 z-10 flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-white hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>

                  {/* Photo counter */}
                  {previews.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-3 py-1 text-sm text-white">
                      {previewIndex + 1} / {previews.length}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>}

        {step === 2 && <div className="animate-fade-in space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Description *</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the equipment (brand, model, condition, issues)..." rows={4} className="resize-none bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Preferred Collection Window</Label>
              <Select value={preferredWindow} onValueChange={setPreferredWindow}>
                <SelectTrigger className="bg-[#28292b] border-[#555555] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anytime">Anytime</SelectItem>
                  <SelectItem value="morning">Morning (9am-12pm)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                  <SelectItem value="evening">Evening (5pm-8pm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white">Preferred Day Range</Label>
              <Select value={preferredDayRange} onValueChange={setPreferredDayRange}>
                <SelectTrigger className="bg-[#28292b] border-[#555555] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="3_days">Within 3 days</SelectItem>
                  <SelectItem value="week">Within a week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-[#555555] bg-[#1d1d1d] p-3">
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
          </div>}
      </div>
    </MobileLayout>;
}