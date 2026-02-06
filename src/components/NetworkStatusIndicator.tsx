import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStatusIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

/**
 * A small indicator that shows network connection status
 * By default, only visible when offline
 */
export function NetworkStatusIndicator({ 
  className,
  showWhenOnline = false 
}: NetworkStatusIndicatorProps) {
  const { isOnline } = useOnlineStatus();

  // Only show when offline (unless showWhenOnline is true)
  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 py-1.5 text-xs font-medium transition-all duration-300 safe-top",
        isOnline 
          ? "bg-success/90 text-success-foreground" 
          : "bg-destructive/90 text-destructive-foreground",
        className
      )}
    >
      {!isOnline && (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>No internet connection</span>
        </>
      )}
      {isOnline && showWhenOnline && (
        <span>Back online</span>
      )}
    </div>
  );
}
