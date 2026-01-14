import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, Plus, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/new-request", icon: Plus, label: "New" },
  { path: "/requests", icon: ClipboardList, label: "Requests" },
];

export function MobileLayout({ children, showNav = true, className }: MobileLayoutProps) {
  const location = useLocation();
  const { profile } = useAuth();

  const getInitials = () => {
    if (profile?.contact_name) {
      return profile.contact_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "U";
  };

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <main className={cn("flex-1 overflow-hidden", className)}>
        {children}
      </main>
      
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black safe-bottom">
          <div className="h-0.5 bg-primary" />
          <div className="flex items-center justify-around py-2">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 transition-all touch-target",
                    isActive
                      ? "text-primary"
                      : "text-white hover:text-primary"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "animate-scale-in")} />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              );
            })}
            {/* Profile with Avatar */}
            <Link
              to="/profile"
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-all touch-target",
                location.pathname === "/profile"
                  ? "text-primary"
                  : "text-white hover:text-primary"
              )}
            >
              <Avatar className={cn("h-7 w-7", location.pathname === "/profile" && "ring-2 ring-primary ring-offset-1 ring-offset-black")}>
                <AvatarImage src={(profile as any)?.avatar_url} alt={profile?.contact_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium">Profile</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
