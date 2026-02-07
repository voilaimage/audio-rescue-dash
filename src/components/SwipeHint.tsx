import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const HINT_STORAGE_KEY = "swipe-hint-shown";
const HINT_DURATION = 6000; // Show for 6 seconds

interface SwipeHintProps {
  onDismiss?: () => void;
  className?: string;
}

export function SwipeHint({ onDismiss, className }: SwipeHintProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if hint has been shown before
    const hasSeenHint = localStorage.getItem(HINT_STORAGE_KEY);
    
    if (!hasSeenHint) {
      // Show hint on first visit
      setIsVisible(true);
      localStorage.setItem(HINT_STORAGE_KEY, "true");

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, HINT_DURATION);

      return () => clearTimeout(timer);
    }
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none flex items-center justify-end z-40 safe-top safe-right",
        className
      )}
    >
      {/* Semi-transparent overlay to highlight the swipe area */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/30 to-transparent opacity-0 animate-pulse" />

      {/* Hint card positioned on the right with swipe arrow animation */}
      <div className="relative mr-4 mt-20 max-w-xs">
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 backdrop-blur-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-white">Swipe to manage</p>
              <p className="text-xs text-white/60">Swipe left on any card</p>
            </div>
            {/* Animated arrow */}
            <div className="ml-2 flex-shrink-0">
              <ChevronLeft
                className="h-5 w-5 text-primary animate-bounce"
                style={{
                  animation: "bounce 2s infinite, slideLeft 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideLeft {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-8px);
          }
        }
      `}</style>
    </div>
  );
}
