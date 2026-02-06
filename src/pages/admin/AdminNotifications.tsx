import { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Users,
  TrendingUp,
  Calendar as CalendarIcon,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface NotificationLog {
  id: string;
  request_id: string;
  user_id: string;
  event_type: string;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

interface NotificationStats {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  todayCount: number;
  uniqueUsers: number;
}

type DatePreset = "today" | "week" | "month" | "all";

export default function AdminNotifications() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("week");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const dateRange = useMemo(() => {
    if (customDateRange.from && customDateRange.to) {
      return { from: customDateRange.from, to: customDateRange.to };
    }
    
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "month":
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case "all":
      default:
        return { from: undefined, to: undefined };
    }
  }, [datePreset, customDateRange]);

  const fetchLogs = async () => {
    let query = supabase
      .from("notification_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (dateRange.from) {
      query = query.gte("created_at", dateRange.from.toISOString());
    }
    if (dateRange.to) {
      query = query.lte("created_at", dateRange.to.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch notification logs:", error);
    } else {
      setLogs((data as NotificationLog[]) || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [dateRange.from?.toISOString(), dateRange.to?.toISOString()]);

  // Subscribe to realtime updates for notification_queue
  useEffect(() => {
    const channel = supabase
      .channel('notification-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_queue',
        },
        () => {
          // Refetch logs when any change occurs
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange.from?.toISOString(), dateRange.to?.toISOString()]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleTriggerProcessing = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("send-push-notification");
      // Wait a moment then refresh logs
      setTimeout(() => {
        fetchLogs();
      }, 2000);
    } catch (error) {
      console.error("Failed to trigger notification processing:", error);
      setRefreshing(false);
    }
  };

  // Calculate stats
  const stats: NotificationStats = useMemo(() => {
    const today = startOfDay(new Date());
    const uniqueUserIds = new Set(logs.map(l => l.user_id));
    
    return {
      total: logs.length,
      sent: logs.filter(l => l.sent_at && !l.error_message).length,
      pending: logs.filter(l => !l.sent_at).length,
      failed: logs.filter(l => l.error_message).length,
      todayCount: logs.filter(l => new Date(l.created_at) >= today).length,
      uniqueUsers: uniqueUserIds.size,
    };
  }, [logs]);

  const getStatusBadge = (log: NotificationLog) => {
    if (!log.sent_at) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          <Clock className="h-3 w-3" /> Pending
        </span>
      );
    }
    if (log.error_message) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          <XCircle className="h-3 w-3" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <CheckCircle className="h-3 w-3" /> Sent
      </span>
    );
  };

  const formatStatusChange = (oldStatus: string | null, newStatus: string | null) => {
    if (!oldStatus || !newStatus) return "Status changed";
    return `${oldStatus} → ${newStatus}`;
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-gray-400">Push notification delivery stats and logs</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-[#555555] bg-[#28292b] text-white hover:bg-[#333] hover:text-white"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleTriggerProcessing}
              disabled={refreshing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Bell className="mr-2 h-4 w-4" />
              Process Queue
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6 md:gap-4">
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.sent}</p>
            <p className="text-sm text-gray-400">Sent</p>
          </div>
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.pending}</p>
            <p className="text-sm text-gray-400">Pending</p>
          </div>
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.failed}</p>
            <p className="text-sm text-gray-400">Failed</p>
          </div>
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.todayCount}</p>
            <p className="text-sm text-gray-400">Today</p>
          </div>
          <div className="rounded-xl border border-[#333] bg-[#1d1d1d] p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.uniqueUsers}</p>
            <p className="text-sm text-gray-400">Users</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={customDateRange.from ? "custom" : datePreset}
            onValueChange={(value) => {
              if (value !== "custom") {
                setDatePreset(value as DatePreset);
                setCustomDateRange({ from: undefined, to: undefined });
              }
            }}
          >
            <SelectTrigger className="w-[140px] border-[#555555] bg-[#28292b] text-white">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent className="border-[#555555] bg-[#1d1d1d]">
              <SelectItem value="today" className="text-white focus:bg-[#28292b] focus:text-white">Today</SelectItem>
              <SelectItem value="week" className="text-white focus:bg-[#28292b] focus:text-white">Last 7 days</SelectItem>
              <SelectItem value="month" className="text-white focus:bg-[#28292b] focus:text-white">Last 30 days</SelectItem>
              <SelectItem value="all" className="text-white focus:bg-[#28292b] focus:text-white">All time</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "border-[#555555] bg-[#28292b] text-white hover:bg-[#333] hover:text-white",
                  customDateRange.from && "border-primary"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.from ? (
                  <>
                    {format(customDateRange.from, "MMM d")} - {customDateRange.to ? format(customDateRange.to, "MMM d") : "..."}
                  </>
                ) : (
                  "Custom range"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-[#555555] bg-[#1d1d1d]" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customDateRange.from}
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => {
                  setCustomDateRange({ from: range?.from, to: range?.to });
                }}
                numberOfMonths={1}
                className="text-white"
              />
            </PopoverContent>
          </Popover>

          {customDateRange.from && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomDateRange({ from: undefined, to: undefined })}
              className="text-gray-400 hover:text-white"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Notification Logs Table */}
        <div className="rounded-xl border border-[#333] bg-[#1d1d1d] overflow-hidden">
          <div className="border-b border-[#333] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-white">Notification Log</h2>
          </div>
          
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-5 gap-4 px-5 py-3 bg-black/30 border-b border-[#333] text-xs font-medium uppercase tracking-wide text-gray-400">
            <div>Status</div>
            <div>Event</div>
            <div>Request ID</div>
            <div>Created</div>
            <div>Details</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-[#333]">
            {logs.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-500 mb-3" />
                <p className="text-gray-400">No notifications found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Notifications will appear here when request statuses change
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="grid gap-2 px-5 py-4 md:grid-cols-5 md:gap-4 md:items-center"
                >
                  <div>{getStatusBadge(log)}</div>
                  <div>
                    <span className="text-sm text-white">
                      {formatStatusChange(log.old_status, log.new_status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-gray-400">
                      {log.request_id.slice(0, 8)}...
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-400">
                      {format(new Date(log.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <div>
                    {log.error_message ? (
                      <span className="text-xs text-destructive truncate block" title={log.error_message}>
                        {log.error_message}
                      </span>
                    ) : log.sent_at ? (
                      <span className="text-xs text-gray-400">
                        Sent {format(new Date(log.sent_at), "HH:mm:ss")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Awaiting processing</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
