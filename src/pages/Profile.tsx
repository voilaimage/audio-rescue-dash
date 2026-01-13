import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LogOut, Save, Camera, Trash2 } from "lucide-react";
import appBg from "@/assets/app-bg.png";
import logoWhite from "@/assets/logo-white.png";
export default function Profile() {
  const { profile, signOut, refreshProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    business_name: profile?.business_name || "",
    contact_name: profile?.contact_name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    address_line1: profile?.address_line1 || "",
    address_line2: profile?.address_line2 || "",
    city: profile?.city || "",
    postcode: profile?.postcode || "",
    driver_notes: profile?.driver_notes || "",
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload an image file." });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Please upload an image under 2MB." });
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
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
        className="min-h-screen px-5 py-6 safe-top"
        style={{
          backgroundImage: `url(${appBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logoWhite} alt="Audio Salvage UK" className="h-16 w-auto" />
        </div>

        <h1 className="mb-5 font-display text-2xl font-bold text-white">Profile</h1>

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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-sm text-primary hover:underline"
              >
                Change photo
              </button>
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

          <Button onClick={handleSave} disabled={loading} className="w-full touch-target font-semibold">
            {loading ? <LoadingSpinner size="sm" /> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>

          <Button onClick={handleSignOut} variant="outline" className="w-full touch-target text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
