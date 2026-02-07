import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ImageCropper } from "@/components/ImageCropper";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFeedbackSettings } from "@/hooks/useSoundSettings";
import { isHapticSupported } from "@/lib/haptics";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save, Camera, Trash2, ImageIcon, ChevronDown, Bell, BellOff, Smartphone, Volume2, VolumeX, Vibrate, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import appBg from "@/assets/app-bg.png";
import logoWhite from "@/assets/logo-white.png";

export default function Profile() {
  const { profile, refreshProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Push notifications
  const { 
    isRegistered, 
    isLoading: isPushLoading, 
    initialize: initializePush, 
    removeToken,
    isSupported: isPushSupported 
  } = usePushNotifications(user?.id);

  // Feedback settings
  const { 
    soundEnabled, setSoundEnabled, 
    hapticEnabled, setHapticEnabled, 
    resetToDefaults, hasCustomSettings 
  } = useFeedbackSettings();
  const hapticSupported = isHapticSupported();

  const [formData, setFormData] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    email: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    driver_notes: "",
  });

  // Sync form data when profile loads or changes
  useEffect(() => {
    if (profile) {
      setFormData({
        business_name: profile.business_name || "",
        contact_name: profile.contact_name || "",
        phone: profile.phone || "",
        email: profile.email || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        postcode: profile.postcode || "",
        driver_notes: profile.driver_notes || "",
      });
    }
  }, [profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload an image file." });
      return;
    }

    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropperOpen(true);
    
    // Reset file inputs
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!user) return;
    
    setUploadingAvatar(true);

    try {
      const filePath = `${user.id}/avatar.jpg`;

      // Upload cropped and compressed image
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { 
          upsert: true,
          contentType: "image/jpeg"
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "Profile picture updated!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setUploadingAvatar(false);
      // Clean up object URL
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !(profile as any)?.avatar_url) return;
    
    setUploadingAvatar(true);

    try {
      // List and delete all files in user's avatar folder
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        await supabase.storage.from("avatars").remove(filePaths);
      }

      // Update profile to remove avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "Profile picture removed!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Remove failed", description: error.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city,
          postcode: formData.postcode.toUpperCase(),
          driver_notes: formData.driver_notes || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "Profile updated!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };


  const getInitials = () => {
    if (profile?.contact_name) {
      return profile.contact_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "U";
  };

  return (
    <MobileLayout>
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
        <div className="flex-shrink-0 px-5 pt-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoWhite} alt="Audio Salvage UK" className="h-16 w-auto" />
          </div>

          <h1 className="mb-5 font-display text-2xl font-bold text-white">Profile</h1>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          <div className="space-y-4">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={(profile as any)?.avatar_url} alt={profile?.contact_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-[#1d1d1d] border-[#555555]">
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
                    Choose from Gallery
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={uploadingAvatar}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Change photo <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="bg-[#1d1d1d] border-[#555555]">
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
                    Choose from Gallery
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {(profile as any)?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="flex items-center gap-1 text-sm text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Image Cropper Dialog */}
          {selectedImage && (
            <ImageCropper
              open={cropperOpen}
              onClose={() => {
                setCropperOpen(false);
                if (selectedImage) {
                  URL.revokeObjectURL(selectedImage);
                  setSelectedImage(null);
                }
              }}
              imageSrc={selectedImage}
              onCropComplete={handleCroppedImage}
              aspectRatio={1}
              maxSizeKB={500}
            />
          )}

          {/* Business Info */}
          <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Business Info</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Business Name</Label>
                <Input value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Contact Name</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Email</Label>
                <Input value={formData.email} disabled className="bg-[#28292b] border-[#555555] text-gray-400" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Pickup Address</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Address Line 1</Label>
                <Input value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Address Line 2</Label>
                <Input value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-white">City</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-white">Postcode</Label>
                  <Input value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} className="bg-[#28292b] border-[#555555] text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-white">Driver Notes</Label>
                <Textarea value={formData.driver_notes} onChange={(e) => setFormData({ ...formData, driver_notes: e.target.value })} rows={2} placeholder="Parking instructions, access codes, etc." className="resize-none bg-[#28292b] border-[#555555] text-white placeholder:text-gray-500" />
              </div>
            </div>
          </div>

          {/* Notification & Feedback Settings */}
          <div className="space-y-3 rounded-xl border border-[#555555] bg-[#1d1d1d] p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">Notifications & Feedback</h3>
              {hasCustomSettings && (
                <button
                  onClick={() => setShowResetDialog(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isRegistered ? (
                    <Bell className="h-5 w-5 text-primary" />
                  ) : (
                    <BellOff className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">Push Notifications</p>
                    <p className="text-xs text-gray-400">
                      {isPushSupported 
                        ? (isRegistered ? "Enabled" : "Disabled")
                        : "Only available in the mobile app"
                      }
                    </p>
                  </div>
                </div>
                {isPushSupported ? (
                  <Switch
                    checked={isRegistered}
                    disabled={isPushLoading}
                    onCheckedChange={async (checked) => {
                      if (checked) {
                        await initializePush();
                        toast({ title: "Push notifications enabled" });
                      } else {
                        await removeToken();
                        toast({ title: "Push notifications disabled" });
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Smartphone className="h-3 w-3" />
                    App only
                  </div>
                )}
              </div>
              {isPushSupported && isRegistered && (
                <p className="text-xs text-gray-500">
                  You'll receive notifications when your request status changes.
                </p>
              )}

              {/* Sound Feedback Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                <div className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">Sound Feedback</p>
                    <p className="text-xs text-gray-400">
                      {soundEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={(checked) => {
                    setSoundEnabled(checked);
                    toast({ 
                      title: checked ? "Sound feedback enabled" : "Sound feedback disabled" 
                    });
                  }}
                />
              </div>

              {/* Haptic Feedback Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-[#333]">
                <div className="flex items-center gap-3">
                  <Vibrate className={`h-5 w-5 ${hapticEnabled && hapticSupported ? "text-primary" : "text-gray-400"}`} />
                  <div>
                    <p className="text-sm font-medium text-white">Haptic Feedback</p>
                    <p className="text-xs text-gray-400">
                      {hapticSupported 
                        ? (hapticEnabled ? "Enabled" : "Disabled")
                        : "Not supported on this device"
                      }
                    </p>
                  </div>
                </div>
                {hapticSupported ? (
                  <Switch
                    checked={hapticEnabled}
                    onCheckedChange={(checked) => {
                      setHapticEnabled(checked);
                      toast({ 
                        title: checked ? "Haptic feedback enabled" : "Haptic feedback disabled" 
                      });
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Smartphone className="h-3 w-3" />
                    Not available
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full touch-target font-semibold">
            {loading ? <LoadingSpinner size="sm" /> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
          </div>
        </div>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent className="bg-[#1d1d1d] border-[#333]">
            <AlertDialogTitle className="text-white">Reset Feedback Settings?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will restore sound and haptic feedback to their default settings (both enabled).
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel className="text-white bg-[#28292b] border-[#555555] hover:bg-[#333]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => {
                  resetToDefaults();
                  setShowResetDialog(false);
                  toast({ title: "Feedback settings reset to defaults" });
                }}
              >
                Reset
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MobileLayout>
  );
}
