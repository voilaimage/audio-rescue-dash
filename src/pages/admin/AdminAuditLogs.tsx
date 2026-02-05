import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { Shield, User, Calendar, Filter, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: unknown;
  driver_name?: string;
  customer_name?: string;
};

type Driver = {
  id: string;
  contact_name: string;
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch drivers for filter dropdown
      const { data: driverData } = await supabase
        .from("profiles")
        .select("id, contact_name")
        .eq("role", "driver")
        .order("contact_name");

      setDrivers(driverData || []);

      // Fetch audit logs
      await fetchLogs();
    };

    fetchData();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (selectedDriver !== "all") {
      query = query.eq("user_id", selectedDriver);
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }

    const { data: logData, error } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      setLoading(false);
      return;
    }

    // Enrich logs with driver and customer names
    const enrichedLogs = await Promise.all(
      (logData || []).map(async (log) => {
        // Get driver name
        const { data: driverProfile } = await supabase
          .from("profiles")
          .select("contact_name")
          .eq("id", log.user_id)
          .maybeSingle();

        // Get customer name if resource_id exists
        let customerName: string | undefined;
        if (log.resource_id && log.resource_type === "profile") {
          const { data: customerProfile } = await supabase
            .from("profiles")
            .select("business_name")
            .eq("id", log.resource_id)
            .maybeSingle();
          customerName = customerProfile?.business_name;
        }

        return {
          ...log,
          driver_name: driverProfile?.contact_name || "Unknown",
          customer_name: customerName,
        };
      })
    );

    setLogs(enrichedLogs);
    setLoading(false);
  };

  // Apply filters when they change
  useEffect(() => {
    fetchLogs();
  }, [selectedDriver, dateFrom, dateTo]);

  // Filter logs by search query (client-side)
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.driver_name?.toLowerCase().includes(query) ||
        log.customer_name?.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "view_customer_profile":
        return (
          <Badge variant="outline" className="border-primary/50 text-primary">
            <Eye className="mr-1 h-3 w-3" />
            View Profile
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted-foreground/50">
            {action}
          </Badge>
        );
    }
  };

  const handleClearFilters = () => {
    setSelectedDriver("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Audit Logs
            </h1>
            <p className="text-sm text-gray-400">
              Track driver access to customer data
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Filters</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#28292b] border-[#333] pl-9 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Driver Filter */}
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="bg-[#28292b] border-[#333] text-white">
                <User className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="All Drivers" />
              </SelectTrigger>
              <SelectContent className="bg-[#28292b] border-[#333]">
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.contact_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="date"
                placeholder="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-[#28292b] border-[#333] pl-9 text-white"
              />
            </div>

            {/* Date To */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="date"
                placeholder="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-[#28292b] border-[#333] pl-9 text-white"
              />
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="bg-[#28292b] border-[#333] text-gray-400 hover:bg-[#333] hover:text-white"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-600" />
              <p className="mt-4 text-gray-400">No audit logs found</p>
              <p className="text-sm text-gray-500">
                Logs will appear here when drivers access customer data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#333] bg-black/30">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Timestamp
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Driver
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Action
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Customer
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-white">
                        {format(
                          new Date(log.created_at),
                          "dd MMM yyyy, HH:mm:ss"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-white">
                            {log.driver_name}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-300">
                        {log.customer_name || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {log.details ? (
                          <code className="rounded bg-black/30 px-2 py-1 text-xs">
                            {JSON.stringify(log.details)}
                          </code>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        {!loading && filteredLogs.length > 0 && (
          <div className="text-sm text-gray-400">
            Showing {filteredLogs.length} log entries
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
