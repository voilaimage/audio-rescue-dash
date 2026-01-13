import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, ClipboardList, ChevronRight, Sparkles } from "lucide-react";
import appBg from "@/assets/app-bg.png";
import logo from "@/assets/logo-white.png";

export default function Home() {
  const { profile } = useAuth();

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
        <div className="mb-6 flex justify-center">
          <img src={logo} alt="Audio Salvage UK" className="h-24 w-auto" />
        </div>

        {/* Welcome Header */}
        <div className="mb-6 animate-fade-in">
          <p className="text-sm text-white">Welcome back,</p>
          <h1 className="font-display text-2xl font-bold text-white">
            {profile?.contact_name || "Partner"}
          </h1>
          <p className="mt-0.5 text-sm text-white">
            {profile?.business_name}
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-3">
          <Link to="/new-request" className="block">
            <div className="group rounded-xl border border-[#555555] bg-[#1d1d1d] p-5 shadow-card transition-all hover:border-primary/40 hover:bg-[#1d1d1d]/90">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#f59f0a]">
                    <Camera className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    New Collection Request
                  </h2>
                  <p className="mt-1 text-sm text-white">
                    Take photos and request a free pickup
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#f59f0a] transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link to="/requests" className="block">
            <div className="group rounded-xl border border-[#555555] bg-[#1d1d1d] p-5 shadow-card transition-all hover:border-muted-foreground/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#f59f0a]">
                    <ClipboardList className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    View Past Requests
                  </h2>
                  <p className="mt-1 text-sm text-white">
                    Track status of your collection requests
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#f59f0a] transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="mt-6 animate-fade-in rounded-lg border border-[#555555] bg-[#1d1d1d] p-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#f59f0a]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">How it works</h3>
          <p className="mt-1 text-sm text-white">
            Submit photos of faulty or unsellable high-end audio equipment.
            We'll arrange a free collection at a time that suits you.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
