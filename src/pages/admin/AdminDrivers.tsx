import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, Profile } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Truck, Mail, Phone, Trash2 } from "lucide-react";

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    contact_name: "",
    phone: "",
    coverage_areas: "",
  });

  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching drivers:", error);
    }

    setDrivers((data as Profile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/driver-login`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Parse coverage areas
      const coverageAreas = formData.coverage_areas
        .split(",")
        .map((area) => area.trim().toUpperCase())
        .filter((area) => area.length > 0);

      // Create profile with driver role
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: formData.email,
        contact_name: formData.contact_name,
        phone: formData.phone,
        role: "driver",
        business_name: "Driver",
        address_line1: "N/A",
        city: "N/A",
        postcode: "N/A",
        coverage_areas: coverageAreas,
      });

      if (profileError) throw profileError;

      toast({
        title: "Driver created",
        description: `${formData.contact_name} has been added as a driver.`,
      });

      // Reset form and close dialog
      setFormData({
        email: "",
        password: "",
        contact_name: "",
        phone: "",
        coverage_areas: "",
      });
      setCreateDialogOpen(false);
      fetchDrivers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create driver",
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDriver = async (driver: Profile) => {
    if (!confirm(`Are you sure you want to delete ${driver.contact_name}?`)) {
      return;
    }

    try {
      // Delete profile (auth user will be orphaned but that's okay)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", driver.id);

      if (error) throw error;

      toast({
        title: "Driver deleted",
        description: `${driver.contact_name} has been removed.`,
      });

      fetchDrivers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete driver",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Drivers</h1>
            <p className="text-sm text-gray-400">Manage driver accounts and coverage areas</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1d1d1d] border-[#333]">
              <DialogHeader>
                <DialogTitle className="text-white">Create Driver Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDriver} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name" className="text-white">Full Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="bg-[#28292b] border-[#555] text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-[#28292b] border-[#555] text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-[#28292b] border-[#555] text-white"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-[#28292b] border-[#555] text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage_areas" className="text-white">
                    Coverage Areas (postcodes, comma-separated)
                  </Label>
                  <Input
                    id="coverage_areas"
                    value={formData.coverage_areas}
                    onChange={(e) => setFormData({ ...formData, coverage_areas: e.target.value })}
                    placeholder="e.g. SW1, SW2, W1, EC1"
                    className="bg-[#28292b] border-[#555] text-white placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400">
                    Enter postcode prefixes this driver covers
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? <LoadingSpinner size="sm" /> : "Create Driver"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Drivers Table */}
        {drivers.length === 0 ? (
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] px-5 py-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No drivers yet</p>
            <p className="text-sm text-gray-500 mt-1">Create a driver account to get started</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Contact</TableHead>
                  <TableHead className="text-gray-400">Coverage Areas</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id} className="border-[#333] hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{driver.contact_name}</p>
                          <p className="text-sm text-gray-400">Driver</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Mail className="h-3 w-3" />
                          {driver.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {driver.coverage_areas && driver.coverage_areas.length > 0 ? (
                          driver.coverage_areas.map((area) => (
                            <Badge key={area} variant="secondary" className="bg-primary/20 text-primary">
                              <MapPin className="h-3 w-3 mr-1" />
                              {area}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No areas set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteDriver(driver)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
