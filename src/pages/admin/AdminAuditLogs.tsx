import { useEffect, useState, useMemo, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { Shield, User, Calendar, Filter, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchDrivers = async () => {
      const { data: driverData } = await supabase
        .from("profiles")
        .select("id, contact_name")
        .eq("role", "driver")
        .order("contact_name");

      setDrivers(driverData || []);
    };

    fetchDrivers();
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    // Calculate range for pagination
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build count query for total
    let countQuery = supabase
      .from("audit_logs")
      .select("*", { count: "exact", head: true });

    // Build data query
    let dataQuery = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply filters to both queries
    if (selectedDriver !== "all") {
      countQuery = countQuery.eq("user_id", selectedDriver);
      dataQuery = dataQuery.eq("user_id", selectedDriver);
    }

    if (dateFrom) {
      countQuery = countQuery.gte("created_at", `${dateFrom}T00:00:00`);
      dataQuery = dataQuery.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      countQuery = countQuery.lte("created_at", `${dateTo}T23:59:59`);
      dataQuery = dataQuery.lte("created_at", `${dateTo}T23:59:59`);
    }

    // Execute both queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (dataResult.error) {
      console.error("Error fetching audit logs:", dataResult.error);
      setLoading(false);
      return;
    }

    setTotalCount(countResult.count || 0);

    const logData = dataResult.data || [];

    // Collect unique user_ids and resource_ids for batch lookup
    const userIds = [...new Set(logData.map((log) => log.user_id))];
    const resourceIds = [...new Set(
      logData
        .filter((log) => log.resource_id && log.resource_type === "profile")
        .map((log) => log.resource_id as string)
    )];

    // Batch fetch all profiles we need
    const allProfileIds = [...new Set([...userIds, ...resourceIds])];
    
    let profileMap: Map<string, { contact_name: string; business_name: string }> = new Map();
    
    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, contact_name, business_name")
        .in("id", allProfileIds);

      if (profiles) {
        profiles.forEach((p) => {
          profileMap.set(p.id, { contact_name: p.contact_name, business_name: p.business_name });
        });
      }
    }

    // Enrich logs with driver and customer names from the map
    const enrichedLogs = logData.map((log) => {
      const driverProfile = profileMap.get(log.user_id);
      const customerProfile = log.resource_id && log.resource_type === "profile" 
        ? profileMap.get(log.resource_id) 
        : null;

      return {
        ...log,
        driver_name: driverProfile?.contact_name || "Unknown",
        customer_name: customerProfile?.business_name,
      };
    });

    setLogs(enrichedLogs);
    setLoading(false);
  }, [currentPage, pageSize, selectedDriver, dateFrom, dateTo]);

  // Fetch logs when filters or pagination changes
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
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

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, totalCount);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

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
          <Badge variant="outline" className="border-gray-500/50 text-gray-400">
            {action}
          </Badge>
        );
    }
  };

  const formatDetails = (details: unknown): string | null => {
    if (!details || typeof details !== "object") return null;
    
    const obj = details as Record<string, unknown>;
    const parts: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const formattedKey = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      
      let formattedValue = String(value);
      if (typeof value === "string" && value.length === 36 && value.includes("-")) {
        formattedValue = `...${value.substring(value.length - 8)}`;
      }
      
      parts.push(`${formattedKey}: ${formattedValue}`);
    }
    
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleClearFilters = () => {
    setSelectedDriver("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setCurrentPage(1);
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
                className="bg-[#28292b] border-[#555555] pl-9 text-white placeholder:text-gray-500"
              />
            </div>

            {/* Driver Filter */}
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="bg-[#28292b] border-[#555555] text-white">
                <User className="mr-2 h-4 w-4 text-gray-400" />
                <SelectValue placeholder="All Drivers" />
              </SelectTrigger>
              <SelectContent className="bg-[#28292b] border-[#555555]">
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
                className="bg-[#28292b] border-[#555555] pl-9 text-white"
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
                className="bg-[#28292b] border-[#555555] pl-9 text-white"
              />
            </div>

            {/* Clear Filters */}
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="bg-[#28292b] border-[#555555] text-gray-400 hover:bg-white/5 hover:text-white"
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
              <Shield className="mx-auto h-12 w-12 text-gray-500" />
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
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-white/80">
                        {log.customer_name || "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {formatDetails(log.details) || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalCount > 0 && (
            <div className="flex items-center justify-between border-t border-[#333] px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  Showing {showingFrom} to {showingTo} of {totalCount} entries
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Per page:</span>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20 bg-[#28292b] border-[#555555] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#28292b] border-[#555555]">
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="bg-[#28292b] border-[#555555] text-white hover:bg-white/5 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-3 text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="bg-[#28292b] border-[#555555] text-white hover:bg-white/5 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
