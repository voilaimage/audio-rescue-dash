import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DriverLayout } from "@/components/layout/DriverLayout";
import { SwipeHint } from "@/components/SwipeHint";
import { SwipeableCard } from "@/components/SwipeableCard";
import { supabase, RequestWithPhotos, DriverViewProfile } from "@/lib/supabase";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday, isFuture, startOfDay } from "date-fns";
import { MapPin, Clock, ChevronRight, Building2, Calendar, Sun, Sunset, Moon, Timer } from "lucide-react";
import { JobThumbnail } from "@/components/driver/JobThumbnail";
import { hapticFeedback } from "@/lib/haptics";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  accepted: { bg: "bg-primary/10", text: "text-primary", label: "Accepted" },
  scheduled: { bg: "bg-warning/10", text: "text-warning", label: "Scheduled" },
  collected: { bg: "bg-success/10", text: "text-success", label: "Collected" },
};

const windowConfig: Record<string, { icon: typeof Sun; label: string }> = {
  anytime: { icon: Clock, label: "Anytime" },
  morning: { icon: Sun, label: "Morning" },
  afternoon: { icon: Sunset, label: "Afternoon" },
  evening: { icon: Moon, label: "Evening" },
};

const dayRangeLabels: Record<string, string> = {
  none: "No preference",
  tomorrow: "Tomorrow",
  "3_days": "Within 3 days",
  week: "Within a week",
};

export default function DriverHome() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      // Fetch requests without profile join (drivers no longer have direct profile access)
      const { data, error } = await supabase
        .from("requests")
        .select("*, request_photos(*)")
        .in("status", ["accepted", "scheduled", "collected"])
        .order("scheduled_start", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error fetching requests:", error);
        setLoading(false);
        return;
      }

      const requestsData = (data as unknown as RequestWithPhotos[]) || [];

      // Fetch limited profile data for each request using secure RPC function
      const requestsWithProfiles: RequestWithPhotos[] = await Promise.all(
        requestsData.map(async (request) => {
          const { data: profileData, error: profileError } = await supabase
            .rpc("get_customer_profile_for_driver", { _profile_id: request.user_id });

          if (!profileError && profileData && profileData.length > 0) {
            return { ...request, profiles: profileData[0] as DriverViewProfile };
          }
          return request;
        })
      );

      setRequests(requestsWithProfiles);
      setLoading(false);
    };

    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("driver-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter requests by tab
  const filteredRequests = useMemo(() => {
    const today = startOfDay(new Date());

    return requests.filter((request) => {
      if (activeTab === "today") {
        // Today: scheduled for today OR accepted without schedule (unscheduled queue)
        if (request.scheduled_start) {
          return isToday(new Date(request.scheduled_start));
        }
        return request.status === "accepted";
      }

      if (activeTab === "upcoming") {
        // Upcoming: scheduled for future dates
        if (request.scheduled_start) {
          return isFuture(startOfDay(new Date(request.scheduled_start)));
        }
        return false;
      }

      if (activeTab === "completed") {
        // Completed: collected status
        return request.status === "collected";
      }

      return true;
    });
  }, [requests, activeTab]);

  if (loading) {
    return (
      <DriverLayout>
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      {showHint && <SwipeHint onDismiss={() => setShowHint(false)} />}
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Collection Jobs</h1>
          <p className="text-sm text-gray-400">Manage your collection schedule</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-[#1d1d1d]">
            <TabsTrigger value="today" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredRequests.length === 0 ? (
              <div className="rounded-xl border border-[#333] bg-[#1d1d1d] px-5 py-12 text-center">
                <p className="text-gray-400">
                  {activeTab === "today" && "No jobs scheduled for today"}
                  {activeTab === "upcoming" && "No upcoming jobs scheduled"}
                  {activeTab === "completed" && "No completed collections yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => {
                   const status = statusConfig[request.status] || statusConfig.accepted;
                   return (
                     <SwipeableCard
                       key={request.id}
                       onSwipe={() => {
                         hapticFeedback("light");
                         navigate(`/driver/job/${request.id}`);
                       }}
                       actionType="cancel"
                       className="group relative"
                     >
                       <Link
                         to={`/driver/job/${request.id}`}
                         onClick={() => hapticFeedback("light")}
                         className="flex items-center gap-4 rounded-xl border border-[#333] bg-[#1d1d1d] p-4 transition-colors hover:bg-white/5"
                       >
                         {/* Photo */}
                         {request.request_photos?.[0] && (
                           <JobThumbnail fileUrl={request.request_photos[0].file_url} />
                         )}

                         {/* Info */}
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <Building2 className="h-4 w-4 text-primary" />
                             <p className="text-sm font-medium text-white truncate">
                               {request.profiles?.business_name || "Unknown Business"}
                             </p>
                           </div>
                           <div className="flex items-center gap-2 mb-1">
                             <MapPin className="h-4 w-4 text-gray-400" />
                             <p className="text-sm text-gray-400 truncate">
                               {request.profiles?.postcode}, {request.profiles?.city}
                             </p>
                           </div>
                           {request.scheduled_start && (
                             <div className="flex items-center gap-2">
                               <Calendar className="h-4 w-4 text-primary" />
                               <p className="text-sm font-medium text-white">
                                 {format(new Date(request.scheduled_start), "EEE d MMM")}
                               </p>
                               <Clock className="h-4 w-4 text-gray-400 ml-2" />
                               <p className="text-sm text-gray-400">
                                 {format(new Date(request.scheduled_start), "h:mm a")}
                                 {request.scheduled_end && (
                                   <> – {format(new Date(request.scheduled_end), "h:mm a")}</>
                                 )}
                               </p>
                             </div>
                           )}
                           {!request.scheduled_start && (
                             <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1">
                               {request.preferred_window && request.preferred_window !== "anytime" && (
                                 <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1">
                                   {(() => {
                                     const WindowIcon = windowConfig[request.preferred_window]?.icon || Clock;
                                     return <WindowIcon className="h-4 w-4 text-primary" />;
                                   })()}
                                   <span className="text-xs font-medium text-primary">
                                     {windowConfig[request.preferred_window]?.label}
                                   </span>
                                 </div>
                               )}
                               {request.preferred_day_range && request.preferred_day_range !== "none" && (
                                 <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1">
                                   <Timer className="h-4 w-4 text-white" />
                                   <span className="text-xs font-medium text-white">
                                     {dayRangeLabels[request.preferred_day_range]}
                                   </span>
                                 </div>
                               )}
                               {(!request.preferred_window || request.preferred_window === "anytime") && 
                                (!request.preferred_day_range || request.preferred_day_range === "none") && (
                                 <div className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1">
                                   <Calendar className="h-4 w-4 text-white" />
                                   <span className="text-xs font-medium text-white">Flexible timing</span>
                                 </div>
                               )}
                             </div>
                           )}
                         </div>

                         {/* Status & Arrow */}
                         <div className="flex items-center gap-3">
                           <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
                             {status.label}
                           </span>
                           <ChevronRight className="h-5 w-5 text-gray-400" />
                         </div>
                       </Link>
                     </SwipeableCard>
                   );
                 })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}
