import { useRef, useState, useCallback, ReactNode } from "react";
import { hapticFeedback } from "@/lib/haptics";
import { playDeleteSound } from "@/lib/audio-feedback";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipe: () => void;
  actionType: "delete" | "cancel";
  disabled?: boolean;
  className?: string;
}

const SWIPE_THRESHOLD = 80; // Pixels to trigger action
const MAX_SWIPE = 100; // Maximum swipe distance

export function SwipeableCard({
  children,
  onSwipe,
  actionType,
  disabled = false,
  className,
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || disabled) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Determine if this is a horizontal or vertical swipe
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    // Only handle horizontal swipes (left swipe = negative deltaX)
    if (isHorizontalSwipe.current && deltaX < 0) {
      e.preventDefault();
      const swipeDistance = Math.min(Math.abs(deltaX), MAX_SWIPE);
      setTranslateX(-swipeDistance);
      
      // Haptic when reaching threshold
      if (swipeDistance >= SWIPE_THRESHOLD && Math.abs(translateX) < SWIPE_THRESHOLD) {
        hapticFeedback("medium");
      }
    }
  }, [disabled, translateX]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || disabled) {
      touchStartRef.current = null;
      isHorizontalSwipe.current = null;
      return;
    }

    const swipeDistance = Math.abs(translateX);
    
    if (swipeDistance >= SWIPE_THRESHOLD) {
      // Trigger the action with haptic and audio feedback
      hapticFeedback("success");
      playDeleteSound();
      onSwipe();
    }
    
    // Reset position
    setTranslateX(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    isHorizontalSwipe.current = null;
  }, [translateX, onSwipe, disabled]);

  const handleTouchCancel = useCallback(() => {
    setTranslateX(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    isHorizontalSwipe.current = null;
  }, []);

  const swipeProgress = Math.abs(translateX) / SWIPE_THRESHOLD;
  const isTriggered = swipeProgress >= 1;

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Action background revealed on swipe */}
      <div 
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-colors",
          isTriggered ? "bg-destructive" : "bg-destructive/80"
        )}
        style={{ width: `${Math.max(Math.abs(translateX), 0)}px` }}
      >
        <div 
          className={cn(
            "flex items-center gap-2 text-white transition-transform",
            isTriggered ? "scale-110" : "scale-100"
          )}
          style={{ opacity: Math.min(swipeProgress, 1) }}
        >
          {actionType === "delete" ? (
            <Trash2 className="h-5 w-5" />
          ) : (
            <X className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">
            {actionType === "delete" ? "Delete" : "Cancel"}
          </span>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        className={cn(
          "relative z-10 touch-pan-y",
          isSwiping ? "" : "transition-transform duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {children}
      </div>
    </div>
  );
}
