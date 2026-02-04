import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Search, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, User, Archive, ArchiveRestore, X, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type SortColumn = 'business' | 'description' | 'location' | 'driver' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  new: { bg: "bg-primary/10", text: "text-primary", border: "border-primary", label: "New" },
  accepted: { bg: "bg-primary/10", text: "text-primary", border: "border-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", border: "border-warning", label: "Scheduled" },
  collected: { bg: "bg-success/10", text: "text-success", border: "border-success", label: "Collected" },
  completed: { bg: "bg-success/10", text: "text-success", border: "border-success", label: "Completed" },
  cancelled: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive", label: "Cancelled" },
};

type Driver = {
  id: string;
  contact_name: string;
};

type RequestWithArchive = RequestWithPhotos & {
  archived_at?: string | null;
};

export default function AdminRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithArchive[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchData = async () => {
      // Fetch requests
      const { data: requestsData } = await supabase
        .from("requests")
        .select("*, request_photos(*), profiles!requests_user_id_fkey(*), assigned_driver:profiles!requests_assigned_driver_id_fkey(id, contact_name)")
        .order("created_at", { ascending: false });

      setRequests((requestsData as unknown as RequestWithArchive[]) || []);

      // Fetch drivers for filter
      const { data: driversData } = await supabase
        .from("profiles")
        .select("id, contact_name")
        .eq("role", "driver")
        .order("contact_name");

      setDrivers(driversData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Get thumbnail URLs for signed URL generation
  const thumbnailUrls = useMemo(() => 
    requests.map(r => r.request_photos?.[0]?.file_url || null).filter((url): url is string => url !== null),
    [requests]
  );

  // Use signed URLs for thumbnails
  const { signedUrls, loading: urlsLoading } = useSignedUrls(thumbnailUrls);

  // Create a map from original URL to signed URL for easy lookup
  const signedUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    thumbnailUrls.forEach((url, index) => {
      if (signedUrls[index]) {
        map.set(url, signedUrls[index]!);
      }
    });
    return map;
  }, [thumbnailUrls, signedUrls]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    requests.forEach((r) => {
      if (r.profiles?.city) citySet.add(r.profiles.city);
    });
    return Array.from(citySet).sort();
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Archive filter - by default hide archived, show only archived when toggled
      const isArchived = !!request.archived_at;
      if (showArchived && !isArchived) return false;
      if (!showArchived && isArchived) return false;

      // Status filter
      if (statusFilter !== "all" && request.status !== statusFilter) return false;

      // City filter
      if (cityFilter !== "all" && request.profiles?.city !== cityFilter) return false;

      // Driver filter
      if (driverFilter !== "all") {
        if (driverFilter === "unassigned" && request.assigned_driver_id) return false;
        if (driverFilter !== "unassigned" && request.assigned_driver_id !== driverFilter) return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const requestDate = new Date(request.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dateFilter === "today" && daysDiff > 0) return false;
        if (dateFilter === "week" && daysDiff > 7) return false;
        if (dateFilter === "month" && daysDiff > 30) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesBusiness = request.profiles?.business_name?.toLowerCase().includes(query);
        const matchesDescription = request.description.toLowerCase().includes(query);
        const matchesCity = request.profiles?.city?.toLowerCase().includes(query);
        const matchesPostcode = request.profiles?.postcode?.toLowerCase().includes(query);
        if (!matchesBusiness && !matchesDescription && !matchesCity && !matchesPostcode) return false;
      }

      return true;
    });
  }, [requests, statusFilter, cityFilter, driverFilter, dateFilter, searchQuery, showArchived]);

  // Sort filtered requests
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortColumn) {
        case 'business':
          aVal = a.profiles?.business_name?.toLowerCase() || '';
          bVal = b.profiles?.business_name?.toLowerCase() || '';
          break;
        case 'description':
          aVal = a.description.toLowerCase();
          bVal = b.description.toLowerCase();
          break;
        case 'location':
          aVal = a.profiles?.city?.toLowerCase() || '';
          bVal = b.profiles?.city?.toLowerCase() || '';
          break;
        case 'driver':
          aVal = a.assigned_driver?.contact_name?.toLowerCase() || '';
          bVal = b.assigned_driver?.contact_name?.toLowerCase() || '';
          break;
        case 'date':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRequests, sortColumn, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRequests, currentPage, itemsPerPage]);

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Sort indicator component
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 text-primary" />
      : <ChevronDown className="h-3 w-3 text-primary" />;
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, cityFilter, driverFilter, dateFilter, searchQuery, showArchived, itemsPerPage]);

  // Archive/unarchive handler
  const handleArchiveToggle = async (requestId: string, isCurrentlyArchived: boolean) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({ archived_at: isCurrentlyArchived ? null : new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, archived_at: isCurrentlyArchived ? null : new Date().toISOString() }
          : r
      ));

      toast({ 
        title: isCurrentlyArchived ? "Request unarchived" : "Request archived",
        description: isCurrentlyArchived ? "Request has been restored" : "Request has been moved to archive"
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action failed", description: error.message });
    }
  };

  // Count archived requests
  const archivedCount = useMemo(() => 
    requests.filter(r => !!r.archived_at).length, 
    [requests]
  );

  // Get archivable request IDs from current page (collected, completed, cancelled)
  const archivablePageIds = useMemo(() => 
    paginatedRequests
      .filter(r => ['collected', 'completed', 'cancelled'].includes(r.status))
      .map(r => r.id),
    [paginatedRequests]
  );

  // Check if all archivable items on current page are selected
  const allArchivableSelected = archivablePageIds.length > 0 && 
    archivablePageIds.every(id => selectedIds.has(id));

  // Toggle single selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all archivable selections on current page
  const toggleSelectAll = () => {
    if (allArchivableSelected) {
      // Deselect all on current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        archivablePageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Select all archivable on current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        archivablePageIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  // Bulk archive/unarchive handler
  const handleBulkArchive = async (archive: boolean) => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from("requests")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        selectedIds.has(r.id)
          ? { ...r, archived_at: archive ? new Date().toISOString() : null }
          : r
      ));

      toast({ 
        title: archive ? `${selectedIds.size} requests archived` : `${selectedIds.size} requests unarchived`,
        description: archive ? "Requests have been moved to archive" : "Requests have been restored"
      });

      setSelectedIds(new Set());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Bulk action failed", description: error.message });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvHeaders = [
      'ID',
      'Business Name',
      'Contact Name',
      'Description',
      'City',
      'Postcode',
      'Address',
      'Phone',
      'Driver',
      'Status',
      'Created At',
      'Scheduled Start',
      'Scheduled End',
      'Collected At',
      'Collected By'
    ];

    const csvRows = sortedRequests.map(request => [
      request.id,
      request.profiles?.business_name || '',
      request.profiles?.contact_name || '',
      `"${(request.description || '').replace(/"/g, '""')}"`,
      request.profiles?.city || '',
      request.profiles?.postcode || '',
      `"${((request.profiles?.address_line1 || '') + (request.profiles?.address_line2 ? ', ' + request.profiles.address_line2 : '')).replace(/"/g, '""')}"`,
      request.profiles?.phone || '',
      request.assigned_driver?.contact_name || 'Unassigned',
      request.status,
      request.created_at ? format(new Date(request.created_at), 'yyyy-MM-dd HH:mm') : '',
      request.scheduled_start ? format(new Date(request.scheduled_start), 'yyyy-MM-dd HH:mm') : '',
      request.scheduled_end ? format(new Date(request.scheduled_end), 'yyyy-MM-dd HH:mm') : '',
      request.collected_at ? format(new Date(request.collected_at), 'yyyy-MM-dd HH:mm') : '',
      request.collected_by_name || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `requests-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: `Exported ${sortedRequests.length} requests to CSV`
    });
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
      <div className="space-y-5">
        {/* Header */}
        <div className={`-mx-6 -mt-6 px-6 py-4 ${showArchived ? "bg-primary" : ""}`}>
          <h1 className="font-display text-2xl font-bold text-white">
            {showArchived ? "Archived Requests" : "All Requests"}
          </h1>
          <p className={`text-sm ${showArchived ? "text-white/80" : "text-gray-400"}`}>
            {filteredRequests.length} of {requests.length} requests
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search business, description, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#1d1d1d] border-[#333] text-white placeholder:text-gray-500"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="collected">Collected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-[160px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-[160px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Driver" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>{driver.contact_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Archive Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className={`bg-[#1d1d1d] border-[#333] ${
              showArchived 
                ? "border-primary bg-primary/10 text-primary hover:bg-primary hover:text-white hover:border-primary" 
                : "text-white hover:bg-[#2a2a2a] hover:border-[#444] hover:text-white"
            }`}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? "Viewing Archived" : `Archive (${archivedCount})`}
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={sortedRequests.length === 0}
            className="bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] hover:border-[#444] hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-primary bg-primary/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">
                {selectedIds.size} request{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {showArchived ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkArchive(false)}
                  className="border-success bg-success/10 text-success hover:bg-success hover:text-white"
                >
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Unarchive Selected
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkArchive(true)}
                  className="bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] hover:border-[#444]"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Selected
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333] bg-black/30">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={allArchivableSelected && archivablePageIds.length > 0}
                    onCheckedChange={toggleSelectAll}
                    disabled={archivablePageIds.length === 0}
                    className="border-gray-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('business')}
                >
                  <div className="flex items-center gap-1">
                    Business
                    <SortIndicator column="business" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-1">
                    Description
                    <SortIndicator column="description" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center gap-1">
                    Location
                    <SortIndicator column="location" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('driver')}
                >
                  <div className="flex items-center gap-1">
                    Driver
                    <SortIndicator column="driver" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <SortIndicator column="date" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIndicator column="status" />
                  </div>
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {sortedRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No requests found
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request) => {
                  const status = statusConfig[request.status] || statusConfig.new;
                  const firstPhotoUrl = request.request_photos?.[0]?.file_url;
                  const signedUrl = firstPhotoUrl ? signedUrlMap.get(firstPhotoUrl) : null;
                  const isArchivable = ['collected', 'completed', 'cancelled'].includes(request.status);
                  const isSelected = selectedIds.has(request.id);
                    return (
                      <tr key={request.id} className={`hover:bg-white/5 ${isSelected ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-3">
                          {isArchivable ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(request.id)}
                              className="border-gray-500 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {firstPhotoUrl && urlsLoading ? (
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-[#28292b] flex items-center justify-center">
                                <LoadingSpinner size="sm" />
                              </div>
                            ) : firstPhotoUrl && signedUrl ? (
                              <img
                                src={signedUrl}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-primary flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {request.profiles?.business_name?.charAt(0).toUpperCase() || "B"}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">
                                {request.profiles?.business_name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {request.profiles?.contact_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-[200px] truncate text-sm text-white">
                            {request.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{request.profiles?.city}</p>
                          <p className="text-xs text-gray-400">{request.profiles?.postcode}</p>
                        </td>
                        <td className="px-4 py-3">
                          {request.assigned_driver ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                                <User className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm text-white">
                                {request.assigned_driver.contact_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">
                            {format(new Date(request.created_at), "d MMM yyyy")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(request.created_at), "h:mm a")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text} ${status.border}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* Archive/Unarchive button - only for collected, completed, or cancelled */}
                            {isArchivable && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleArchiveToggle(request.id, !!request.archived_at);
                                }}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                  request.archived_at 
                                    ? "bg-success/20 text-success hover:bg-success/30" 
                                    : "bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white"
                                }`}
                                title={request.archived_at ? "Unarchive" : "Archive"}
                              >
                                {request.archived_at ? (
                                  <ArchiveRestore className="h-4 w-4" />
                                ) : (
                                  <Archive className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <Link
                              to={`/admin/requests/${request.id}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-[#333] bg-[#1d1d1d] px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} requests
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                  <SelectTrigger className="w-[70px] h-8 bg-[#1d1d1d] border-[#333] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 rounded text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-white"
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
