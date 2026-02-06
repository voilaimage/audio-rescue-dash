import { useEffect, useRef, useCallback } from "react";

interface UseEdgeSwipeOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  edgeWidth?: number;
  minSwipeDistance?: number;
  maxVerticalDistance?: number;
}

export function useEdgeSwipe({
  onSwipeRight,
  onSwipeLeft,
  edgeWidth = 30,
  minSwipeDistance = 50,
  maxVerticalDistance = 100,
}: UseEdgeSwipeOptions) {
  const touchStartRef = useRef<{ x: number; y: number; fromEdge: "left" | "right" | null } | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      
      let fromEdge: "left" | "right" | null = null;
      
      // Check if touch started from left edge
      if (touch.clientX <= edgeWidth) {
        fromEdge = "left";
      }
      // Check if touch started from right edge
      else if (touch.clientX >= screenWidth - edgeWidth) {
        fromEdge = "right";
      }
      
      if (fromEdge) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          fromEdge,
        };
      }
    },
    [edgeWidth]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // Ensure it's a horizontal swipe (not too much vertical movement)
      if (deltaY > maxVerticalDistance) {
        touchStartRef.current = null;
        return;
      }
      
      // Check for swipe right from left edge
      if (
        touchStartRef.current.fromEdge === "left" &&
        deltaX >= minSwipeDistance &&
        onSwipeRight
      ) {
        onSwipeRight();
      }
      
      // Check for swipe left from right edge
      if (
        touchStartRef.current.fromEdge === "right" &&
        deltaX <= -minSwipeDistance &&
        onSwipeLeft
      ) {
        onSwipeLeft();
      }
      
      touchStartRef.current = null;
    },
    [minSwipeDistance, maxVerticalDistance, onSwipeRight, onSwipeLeft]
  );

  useEffect(() => {
    // Only add listeners on mobile/touch devices
    if (!("ontouchstart" in window)) return;
    
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
}
