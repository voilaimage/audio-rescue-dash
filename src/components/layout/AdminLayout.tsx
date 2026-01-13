import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/requests", icon: ClipboardList, label: "All Requests" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-border px-5 py-5">
            <h1 className="font-display text-lg font-bold text-foreground">
              AudioSalvageUK
            </h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1 p-3">
            {sidebarItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-border p-3">
            <div className="mb-3 rounded-lg bg-secondary p-3">
              <p className="text-sm font-medium text-foreground">{profile?.contact_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-60 flex-1 p-6">{children}</main>
    </div>
  );
}
