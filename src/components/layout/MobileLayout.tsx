import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, Plus, ClipboardList, User } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
}

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/new-request", icon: Plus, label: "New" },
  { path: "/requests", icon: ClipboardList, label: "Requests" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function MobileLayout({ children, showNav = true, className }: MobileLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className={cn("flex-1 overflow-y-auto", showNav && "pb-20", className)}>
        {children}
      </main>
      
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom">
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
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "animate-scale-in")} />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
