import { Link } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Camera, ClipboardList, ChevronRight, Sparkles } from "lucide-react";

export default function Home() {
  const { profile } = useAuth();

  return (
    <MobileLayout>
      <div className="px-6 py-8 safe-top">
        {/* Welcome Header */}
        <div className="mb-8 animate-fade-in">
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-2xl font-bold">
            {profile?.contact_name || "Partner"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.business_name}
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-4">
          <Link to="/new-request" className="block">
            <div className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-6 shadow-card transition-all hover:border-primary/50 hover:shadow-glow">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
                    <Camera className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">
                    New Collection Request
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Take photos and request a free pickup
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link to="/requests" className="block">
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:border-muted-foreground/30">
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
                    <ClipboardList className="h-7 w-7 text-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">
                    View Past Requests
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track status of your collection requests
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="mt-8 animate-fade-in rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/20">
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h3 className="font-medium">How it works</h3>
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
