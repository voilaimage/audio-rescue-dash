import { useEffect, useState, useCallback, useRef } from "react";

interface UseOnlineStatusOptions {
  onReconnect?: () => void;
}

/**
 * Hook to track online/offline status and trigger callback when coming back online
 */
export function useOnlineStatus(options: UseOnlineStatusOptions = {}) {
  const { onReconnect } = options;
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const wasOfflineRef = useRef(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Only trigger reconnect callback if we were previously offline
    if (wasOfflineRef.current && onReconnect) {
      console.log("Connection restored, triggering sync...");
      onReconnect();
    }
    wasOfflineRef.current = false;
  }, [onReconnect]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    wasOfflineRef.current = true;
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline };
}
