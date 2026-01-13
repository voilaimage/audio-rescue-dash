import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/ui/loading-spinner";

// Pages
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NewRequest from "./pages/NewRequest";
import Requests from "./pages/Requests";
import RequestDetail from "./pages/RequestDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminRequestDetail from "./pages/admin/AdminRequestDetail";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && profile?.role !== "admin") return <Navigate to="/home" replace />;
  if (!adminOnly && profile?.role === "admin") return <Navigate to="/admin" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user && profile?.role === "admin") return <Navigate to="/admin" replace />;
  if (user && profile) return <Navigate to="/home" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/new-request" element={<ProtectedRoute><NewRequest /></ProtectedRoute>} />
      <Route path="/requests" element={<ProtectedRoute><Requests /></ProtectedRoute>} />
      <Route path="/requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/requests" element={<ProtectedRoute adminOnly><AdminRequests /></ProtectedRoute>} />
      <Route path="/admin/requests/:id" element={<ProtectedRoute adminOnly><AdminRequestDetail /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
