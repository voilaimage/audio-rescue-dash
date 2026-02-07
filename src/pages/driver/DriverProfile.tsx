import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { User, Phone, Mail, MapPin, Volume2, VolumeX, Vibrate, Smartphone, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useFeedbackSettings } from "@/hooks/useSoundSettings";
import { isHapticSupported } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DriverProfile() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const { 
    soundEnabled, setSoundEnabled, 
    hapticEnabled, setHapticEnabled, 
    resetToDefaults, hasCustomSettings 
  } = useFeedbackSettings();
  const hapticSupported = isHapticSupported();

  const initials = profile?.contact_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "D";

  return (
    <DriverLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-white">My Profile</h1>
          <p className="text-sm text-gray-400">Your driver account details</p>
        </div>

        {/* Avatar & Name Card */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.contact_name} />
              <AvatarFallback className="bg-primary/20 text-2xl font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white">{profile?.contact_name}</h2>
              <span className="inline-block mt-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Driver
              </span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
          <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-400">
            Contact Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-base font-medium text-white">{profile?.phone || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-base font-medium text-white">{profile?.email || "Not set"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage Areas */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Coverage Areas
            </h3>
          </div>
          {profile?.coverage_areas && profile.coverage_areas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.coverage_areas.map((area) => (
                <span
                  key={area}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white"
                >
                  {area}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No coverage areas assigned</p>
          )}
        </div>

        {/* Feedback Settings */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Feedback Settings
            </h3>
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
          
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-white">Sound Feedback</p>
                <p className="text-xs text-gray-400">
                  Audio cues for swipe gestures
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

          {/* Haptic Toggle */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#333]">
            <div className="flex items-center gap-3">
              <Vibrate className={`h-5 w-5 ${hapticEnabled && hapticSupported ? "text-primary" : "text-gray-400"}`} />
              <div>
                <p className="text-sm font-medium text-white">Haptic Feedback</p>
                <p className="text-xs text-gray-400">
                  {hapticSupported 
                    ? "Vibration for gestures"
                    : "Not supported"
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
                N/A
              </div>
            )}
          </div>
        </div>

        {/* Info Note */}
        <div className="rounded-xl border border-[#333] bg-white/5 p-4">
          <p className="text-sm text-gray-400">
            To update your profile details or coverage areas, please contact an administrator.
          </p>
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
                  toast({ title: "Feedback settings reset" });
                }}
              >
                Reset
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DriverLayout>
  );
}
