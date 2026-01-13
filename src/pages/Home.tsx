import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, ClipboardList, ChevronRight, Sparkles } from "lucide-react";

export default function Home() {
  const { profile } = useAuth();

  return (
    <MobileLayout>
      <div className="px-5 py-6 safe-top">
        {/* Welcome Header */}
        <div className="mb-6 animate-fade-in">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {profile?.contact_name || "Partner"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {profile?.business_name}
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-3">
          <Link to="/new-request" className="block">
            <div className="group rounded-xl border border-[#555555] bg-[#1d1d1d] p-5 shadow-card transition-all hover:border-primary/40 hover:bg-[#1d1d1d]/90">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                    <Camera className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    New Collection Request
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Take photos and request a free pickup
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link to="/requests" className="block">
            <div className="group rounded-xl border border-[#555555] bg-[#1d1d1d] p-5 shadow-card transition-all hover:border-muted-foreground/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <ClipboardList className="h-6 w-6 text-foreground" />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    View Past Requests
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track status of your collection requests
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="mt-6 animate-fade-in rounded-lg border border-[#555555] bg-[#1d1d1d] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <Sparkles className="h-4 w-4 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">How it works</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Submit photos of faulty or unsellable high-end audio equipment.
                We'll arrange a free collection at a time that suits you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
