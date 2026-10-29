import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase, RequestWithPhotos } from "@/lib/supabase";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Search, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, User, Archive, ArchiveRestore, X, Download, MapPin, Phone, Calendar, Clock, FileText, Camera, CalendarIcon, LayoutList, LayoutGrid, GripVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SortableRequestRow } from "@/components/admin/SortableRequestRow";

type SortColumn = 'business' | 'description' | 'location' | 'driver' | 'date' | 'status' | 'manual';
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
  sort_order?: number;
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
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>(undefined);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>(undefined);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<SortColumn>('manual');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [compactView, setCompactView] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check if drag is enabled (no filters active, manual sort mode)
  const isDragEnabled = useMemo(() => {
    return sortColumn === 'manual' &&
           statusFilter === 'all' &&
           cityFilter === 'all' &&
           driverFilter === 'all' &&
           dateFilter === 'all' &&
           !searchQuery &&
           !showArchived;
  }, [sortColumn, statusFilter, cityFilter, driverFilter, dateFilter, searchQuery, showArchived]);

  // Fetch data function - extracted for reuse
  const fetchRequests = async () => {
    const { data: requestsData } = await supabase
      .from("requests")
      .select("*, request_photos(*), profiles!requests_user_id_fkey(*), assigned_driver:profiles!requests_assigned_driver_id_fkey(id, contact_name)")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    setRequests((requestsData as unknown as RequestWithArchive[]) || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch requests
      await fetchRequests();

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

  // Real-time subscription for request updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        async (payload) => {
          console.log('Realtime update received:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            // For new requests, fetch fresh data to get all related data
            await fetchRequests();
            // Show toast notification for new request
            sonnerToast.success('New request received!', {
              description: 'A new collection request has just been submitted.',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update the specific request in state
            setRequests(prev => prev.map(r => {
              if (r.id === payload.new.id) {
                return { ...r, ...payload.new } as RequestWithArchive;
              }
              return r;
            }));
          } else if (payload.eventType === 'DELETE') {
            // Remove the deleted request from state
            setRequests(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Calculate status counts for stats cards
  const statusCounts = useMemo(() => {
    const counts = {
      new: 0,
      accepted: 0,
      scheduled: 0,
      collected: 0,
      completed: 0,
      cancelled: 0,
      total: 0
    };
    requests.forEach((r) => {
      if (!r.archived_at) {
        counts.total++;
        if (r.status in counts) {
          counts[r.status as keyof typeof counts]++;
        }
      }
    });
    // Combine collected + completed for display
    counts.collected = counts.collected + counts.completed;
    return counts;
  }, [requests]);

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

      // Date filter - preset options
      if (dateFilter !== "all" && dateFilter !== "custom") {
        const requestDate = new Date(request.created_at);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dateFilter === "today" && daysDiff > 0) return false;
        if (dateFilter === "week" && daysDiff > 7) return false;
        if (dateFilter === "month" && daysDiff > 30) return false;
      }

      // Date range filter - custom range
      if (dateFilter === "custom" && (dateRangeStart || dateRangeEnd)) {
        const requestDate = new Date(request.created_at);
        
        if (dateRangeStart && dateRangeEnd) {
          if (!isWithinInterval(requestDate, { 
            start: startOfDay(dateRangeStart), 
            end: endOfDay(dateRangeEnd) 
          })) return false;
        } else if (dateRangeStart) {
          if (requestDate < startOfDay(dateRangeStart)) return false;
        } else if (dateRangeEnd) {
          if (requestDate > endOfDay(dateRangeEnd)) return false;
        }
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
  }, [requests, statusFilter, cityFilter, driverFilter, dateFilter, dateRangeStart, dateRangeEnd, searchQuery, showArchived]);

  // Sort filtered requests
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortColumn) {
        case 'manual':
          // Sort by sort_order, then by created_at for items with same/no order
          aVal = a.sort_order ?? 0;
          bVal = b.sort_order ?? 0;
          if (aVal !== bVal) {
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
          }
          // Fallback to created_at for items with same sort_order
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
    if (column === 'manual') {
      setSortColumn('manual');
      setSortDirection('asc');
    } else if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = paginatedRequests.findIndex(r => r.id === active.id);
    const newIndex = paginatedRequests.findIndex(r => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Calculate the global index offset for the current page
    const pageOffset = (currentPage - 1) * itemsPerPage;

    // Reorder locally first for instant feedback
    const reorderedPageItems = arrayMove(paginatedRequests, oldIndex, newIndex);
    
    // Update local state with new order
    const updatedRequests = [...requests];
    reorderedPageItems.forEach((item, index) => {
      const requestIndex = updatedRequests.findIndex(r => r.id === item.id);
      if (requestIndex !== -1) {
        updatedRequests[requestIndex] = {
          ...updatedRequests[requestIndex],
          sort_order: pageOffset + index,
        };
      }
    });
    setRequests(updatedRequests);

    // Persist to database
    try {
      const updates = reorderedPageItems.map((item, index) => ({
        id: item.id,
        sort_order: pageOffset + index,
      }));

      // Batch update all affected items
      for (const update of updates) {
        await supabase
          .from("requests")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      sonnerToast.success("Order saved");
    } catch (error) {
      console.error("Failed to save order:", error);
      sonnerToast.error("Failed to save order");
      // Revert on error
      await fetchRequests();
    }
  }, [paginatedRequests, requests, currentPage, itemsPerPage]);

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
  }, [statusFilter, cityFilter, driverFilter, dateFilter, dateRangeStart, dateRangeEnd, searchQuery, showArchived, itemsPerPage]);

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

  // Toggle row expansion
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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

  // Bulk status update handler
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    if (newStatus !== 'new' && newStatus !== 'accepted' && newStatus !== 'scheduled' &&
        newStatus !== 'collected' && newStatus !== 'completed' && newStatus !== 'cancelled') return;
    
    try {
      const updateData: TablesUpdate<'requests'> = { status: newStatus };
      
      // Add timestamps based on status
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("requests")
        .update(updateData)
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setRequests(prev => prev.map(r => 
        selectedIds.has(r.id)
          ? { ...r, ...updateData }
          : r
      ));

      toast({ 
        title: `${selectedIds.size} requests updated`,
        description: `Status changed to ${statusConfig[newStatus]?.label || newStatus}`
      });

      setSelectedIds(new Set());
    } catch (error: any) {
      toast({ variant: "destructive", title: "Bulk status update failed", description: error.message });
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
      <div className="space-y-5 pt-12">
        {/* Header */}
        <div className={`-mx-6 -mt-6 px-6 py-4 ${showArchived ? "bg-primary" : ""}`}>
          <h1 className="font-display text-2xl font-bold text-white">
            {showArchived ? "Archived Requests" : "All Requests"}
          </h1>
          <p className={`text-sm ${showArchived ? "text-white/80" : "text-gray-400"}`}>
            {filteredRequests.length} of {requests.length} requests
          </p>
        </div>

        {/* Stats Cards */}
        {!showArchived && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div 
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                statusFilter === 'all' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-[#333] bg-[#1d1d1d] hover:border-[#444]'
              }`}
              onClick={() => setStatusFilter('all')}
            >
              <p className="text-2xl font-bold text-white">{statusCounts.total}</p>
              <p className="text-xs text-gray-400">Total Active</p>
            </div>
            <div 
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                statusFilter === 'new' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-[#333] bg-[#1d1d1d] hover:border-[#444]'
              }`}
              onClick={() => setStatusFilter('new')}
            >
              <p className="text-2xl font-bold text-primary">{statusCounts.new}</p>
              <p className="text-xs text-gray-400">New</p>
            </div>
            <div 
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                statusFilter === 'accepted' 
                  ? 'border-primary bg-primary/10' 
                  : 'border-[#333] bg-[#1d1d1d] hover:border-[#444]'
              }`}
              onClick={() => setStatusFilter('accepted')}
            >
              <p className="text-2xl font-bold text-primary">{statusCounts.accepted}</p>
              <p className="text-xs text-gray-400">Accepted</p>
            </div>
            <div 
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                statusFilter === 'scheduled' 
                  ? 'border-warning bg-warning/10' 
                  : 'border-[#333] bg-[#1d1d1d] hover:border-[#444]'
              }`}
              onClick={() => setStatusFilter('scheduled')}
            >
              <p className="text-2xl font-bold text-warning">{statusCounts.scheduled}</p>
              <p className="text-xs text-gray-400">Scheduled</p>
            </div>
            <div 
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                statusFilter === 'collected' 
                  ? 'border-success bg-success/10' 
                  : 'border-[#333] bg-[#1d1d1d] hover:border-[#444]'
              }`}
              onClick={() => setStatusFilter('collected')}
            >
              <p className="text-2xl font-bold text-success">{statusCounts.collected}</p>
              <p className="text-xs text-gray-400">Collected</p>
            </div>
            <div 
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                statusFilter === 'cancelled' 
                  ? 'border-destructive bg-destructive/10' 
                  : 'border-[#333] bg-[#1d1d1d] hover:border-[#444]'
              }`}
              onClick={() => setStatusFilter('cancelled')}
            >
              <p className="text-2xl font-bold text-destructive">{statusCounts.cancelled}</p>
              <p className="text-xs text-gray-400">Cancelled</p>
            </div>
          </div>
        )}

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

          <Select value={dateFilter} onValueChange={(value) => {
            setDateFilter(value);
            if (value !== "custom") {
              setDateRangeStart(undefined);
              setDateRangeEnd(undefined);
            }
          }}>
            <SelectTrigger className="w-[140px] bg-[#1d1d1d] border-[#333] text-white">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Pickers - shown when custom is selected */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] hover:border-[#444]",
                      !dateRangeStart && "text-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRangeStart ? format(dateRangeStart, "d MMM yy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRangeStart}
                    onSelect={setDateRangeStart}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              <span className="text-gray-400">–</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] hover:border-[#444]",
                      !dateRangeEnd && "text-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRangeEnd ? format(dateRangeEnd, "d MMM yy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRangeEnd}
                    onSelect={setDateRangeEnd}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {(dateRangeStart || dateRangeEnd) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRangeStart(undefined);
                    setDateRangeEnd(undefined);
                  }}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

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

          {/* Compact View Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompactView(!compactView)}
            className={`bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] hover:border-[#444] hover:text-white ${
              compactView ? "border-primary bg-primary/10" : ""
            }`}
            title={compactView ? "Full view" : "Compact view"}
          >
            {compactView ? <LayoutGrid className="h-4 w-4 mr-2" /> : <LayoutList className="h-4 w-4 mr-2" />}
            {compactView ? "Full View" : "Compact"}
          </Button>

          {/* Manual Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('manual')}
            className={`bg-[#1d1d1d] border-[#333] text-white hover:bg-[#2a2a2a] hover:border-[#444] hover:text-white ${
              sortColumn === 'manual' ? "border-primary bg-primary/10" : ""
            }`}
            title={isDragEnabled ? "Drag to reorder rows" : "Clear filters to enable drag reordering"}
          >
            <GripVertical className="h-4 w-4 mr-2" />
            {sortColumn === 'manual' ? (isDragEnabled ? "Drag to Reorder" : "Manual Order") : "Manual Order"}
          </Button>
        </div>

        {/* Drag Mode Info Banner */}
        {sortColumn === 'manual' && !isDragEnabled && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2 text-sm text-warning">
            <GripVertical className="h-4 w-4" />
            <span>Clear all filters and search to enable drag-and-drop reordering</span>
          </div>
        )}

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
              {/* Bulk Status Update Dropdown */}
              {!showArchived && (
                <Select onValueChange={handleBulkStatusUpdate}>
                  <SelectTrigger className="w-[160px] h-8 bg-[#1d1d1d] border-[#333] text-white text-sm">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1d1d1d] border-[#333]">
                    <SelectItem value="new" className="text-primary">New</SelectItem>
                    <SelectItem value="accepted" className="text-primary">Accepted</SelectItem>
                    <SelectItem value="scheduled" className="text-warning">Scheduled</SelectItem>
                    <SelectItem value="collected" className="text-success">Collected</SelectItem>
                    <SelectItem value="cancelled" className="text-destructive">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
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
                {!compactView && (
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('location')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      <SortIndicator column="location" />
                    </div>
                  </th>
                )}
                {!compactView && (
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('driver')}
                  >
                    <div className="flex items-center gap-1">
                      Driver
                      <SortIndicator column="driver" />
                    </div>
                  </th>
                )}
                {!compactView && (
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      <SortIndicator column="date" />
                    </div>
                  </th>
                )}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={paginatedRequests.map(r => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-[#333]">
                  {sortedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={compactView ? 5 : 8} className="px-4 py-8 text-center text-gray-400">
                        No requests found
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((request) => {
                      const isArchivable = ['collected', 'completed', 'cancelled'].includes(request.status);
                      const isSelected = selectedIds.has(request.id);
                      const isExpanded = expandedIds.has(request.id);
                      
                      return (
                        <SortableRequestRow
                          key={request.id}
                          request={request}
                          statusConfig={statusConfig}
                          signedUrlMap={signedUrlMap}
                          urlsLoading={urlsLoading}
                          isArchivable={isArchivable}
                          isSelected={isSelected}
                          isExpanded={isExpanded}
                          compactView={compactView}
                          isDragEnabled={isDragEnabled}
                          onToggleSelect={toggleSelect}
                          onToggleExpand={toggleExpand}
                          onArchiveToggle={handleArchiveToggle}
                        />
                      );
                    })
                  )}
                </tbody>
              </SortableContext>
            </DndContext>
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
