import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
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
import { Plus, MapPin, Truck, Phone, Trash2, Copy, Clock, CheckCircle, Link as LinkIcon } from "lucide-react";

type DriverInvite = {
  id: string;
  contact_name: string;
  phone: string;
  invite_token: string;
  status: string;
  coverage_areas: string[];
  created_at: string;
  completed_at: string | null;
  profile_id: string | null;
};

export default function AdminDrivers() {
  const [invites, setInvites] = useState<DriverInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state - simplified to just name and phone
  const [formData, setFormData] = useState({
    contact_name: "",
    phone: "",
    coverage_areas: "",
  });

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from("driver_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching driver invites:", error);
    }

    setInvites((data as DriverInvite[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Parse coverage areas
      const coverageAreas = formData.coverage_areas
        .split(",")
        .map((area) => area.trim().toUpperCase())
        .filter((area) => area.length > 0);

      // Create invite record
      const { data, error } = await supabase
        .from("driver_invites")
        .insert({
          contact_name: formData.contact_name,
          phone: formData.phone,
          coverage_areas: coverageAreas,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Driver invite created",
        description: "Copy the link and send it to the driver.",
      });

      // Reset form and close dialog
      setFormData({
        contact_name: "",
        phone: "",
        coverage_areas: "",
      });
      setCreateDialogOpen(false);
      fetchInvites();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to create invite",
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (invite: DriverInvite) => {
    if (!confirm(`Are you sure you want to delete ${invite.contact_name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("driver_invites")
        .delete()
        .eq("id", invite.id);

      if (error) throw error;

      toast({
        title: "Invite deleted",
        description: `${invite.contact_name} has been removed.`,
      });

      fetchInvites();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete invite",
        description: error.message,
      });
    }
  };

  const getInviteLink = (token: string) => {
    // Always use the published URL for driver invites so they work without preview authentication
    const baseUrl = import.meta.env.PROD 
      ? window.location.origin 
      : "https://audio-rescue-dash.lovable.app";
    return `${baseUrl}/driver-setup/${token}`;
  };

  const copyInviteLink = (token: string) => {
    const link = getInviteLink(token);
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Send this link to the driver via WhatsApp or SMS.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
            {status}
          </Badge>
        );
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
      <div className="space-y-6 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Drivers</h1>
            <p className="text-sm text-gray-400">Create invite links and manage driver accounts</p>
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
                <DialogTitle className="text-white">Create Driver Invite</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDriver} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name" className="text-white">Driver Name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="bg-[#28292b] border-[#555] text-white"
                    placeholder="John Smith"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white">Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-[#28292b] border-[#555] text-white"
                    placeholder="07123 456789"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverage_areas" className="text-white">
                    Coverage Areas (optional)
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
                  {creating ? <LoadingSpinner size="sm" /> : "Create Invite Link"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Drivers Table */}
        {invites.length === 0 ? (
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] px-5 py-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No drivers yet</p>
            <p className="text-sm text-gray-500 mt-1">Create an invite link to add a driver</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#333] hover:bg-transparent">
                  <TableHead className="text-gray-400">Driver</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Coverage Areas</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id} className="border-[#333] hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{invite.contact_name}</p>
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Phone className="h-3 w-3" />
                            {invite.phone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(invite.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {invite.coverage_areas && invite.coverage_areas.length > 0 ? (
                          invite.coverage_areas.map((area) => (
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
                      <div className="flex items-center justify-end gap-2">
                        {invite.status === "pending" && (
                          <Button
                            size="sm"
                            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => copyInviteLink(invite.invite_token)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Link
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteInvite(invite)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
