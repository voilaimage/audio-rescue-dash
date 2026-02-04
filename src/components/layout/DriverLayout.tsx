import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Truck, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logoWhite from "@/assets/logo-white.png";
import { useState } from "react";

interface DriverLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { path: "/driver", icon: Truck, label: "Jobs" },
];

export function DriverLayout({ children }: DriverLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#333] bg-black px-4 py-3">
        <img src={logoWhite} alt="Audio Salvage UK" className="h-8 w-auto" />
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/80" onClick={() => setMenuOpen(false)}>
          <div 
            className="absolute right-0 top-[57px] w-64 bg-[#1d1d1d] border-l border-[#333] h-[calc(100vh-57px)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nav Items */}
            <nav className="space-y-1 p-3">
              {sidebarItems.map(({ path, icon: Icon, label }) => {
                const isActive = location.pathname === path || location.pathname.startsWith(path + "/");
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-white hover:bg-white/10 hover:text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* User Section */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-[#333] p-3">
              <div className="mb-3 rounded-lg bg-white/10 p-3">
                <p className="text-sm font-medium text-white">{profile?.contact_name}</p>
                <p className="text-xs text-gray-400">{profile?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-white hover:bg-white/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Full width single column */}
      <main className="flex-1 p-4 text-white">{children}</main>
    </div>
  );
}
