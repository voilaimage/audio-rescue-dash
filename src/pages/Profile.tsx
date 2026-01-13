import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LogOut, Save } from "lucide-react";

export default function Profile() {
  const { profile, signOut, refreshProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    business_name: profile?.business_name || "",
    contact_name: profile?.contact_name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    address_line1: profile?.address_line1 || "",
    address_line2: profile?.address_line2 || "",
    city: profile?.city || "",
    postcode: profile?.postcode || "",
    driver_notes: profile?.driver_notes || "",
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || null,
          city: formData.city,
          postcode: formData.postcode.toUpperCase(),
          driver_notes: formData.driver_notes || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "Profile updated!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <MobileLayout>
      <div className="px-6 py-8 safe-top">
        <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>

        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={formData.business_name} onChange={(e) => setFormData({ ...formData, business_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} disabled className="opacity-60" />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="font-medium">Pickup Address</h3>
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Driver Notes</Label>
              <Textarea value={formData.driver_notes} onChange={(e) => setFormData({ ...formData, driver_notes: e.target.value })} rows={3} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full touch-target">
            {loading ? <LoadingSpinner size="sm" /> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>

          <Button onClick={handleSignOut} variant="outline" className="w-full touch-target text-destructive hover:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
