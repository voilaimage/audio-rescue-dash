import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Truck, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hapticFeedback } from "@/lib/haptics";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoWhite from "@/assets/logo-white.png";

interface DriverLayoutProps {
  children: React.ReactNode;
}

export function DriverLayout({ children }: DriverLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    hapticFeedback("light");
    await signOut();
    navigate("/login", { replace: true });
  };

  const handleNavClick = () => {
    hapticFeedback("light");
  };

  const getInitials = () => {
    if (profile?.contact_name) {
      return profile.contact_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "D";
  };

  const isJobsActive = location.pathname === "/driver" || location.pathname.startsWith("/driver/job");

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]">
      <NetworkStatusIndicator />
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#333] bg-black px-4 py-3">
        <img src={logoWhite} alt="Audio Salvage UK" className="h-12 w-auto" />
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/10 px-3 py-1.5">
            <p className="text-sm font-medium text-primary">{profile?.contact_name}</p>
          </div>
        </div>
      </header>

      {/* Main Content - with bottom padding for nav bar */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 text-white">{children}</main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#333] bg-black">
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary" />
        <div className="flex items-center justify-around px-4 py-2">
          {/* Jobs */}
          <Link
            to="/driver"
            onClick={handleNavClick}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-6 py-2 transition-colors",
              isJobsActive
                ? "text-primary"
                : "text-white/60 hover:text-white"
            )}
          >
            <Truck className="h-6 w-6" />
            <span className="text-xs font-medium">Jobs</span>
          </Link>

          {/* Profile/Settings */}
          <Link
            to="/driver/profile"
            onClick={handleNavClick}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors",
              location.pathname === "/driver/profile"
                ? "text-primary"
                : "text-white/60 hover:text-white"
            )}
          >
            <Avatar className={cn("h-6 w-6", location.pathname === "/driver/profile" && "ring-2 ring-primary ring-offset-1 ring-offset-black")}>
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.contact_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">Settings</span>
          </Link>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-white/60 transition-colors hover:text-destructive"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs font-medium">Sign Out</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
