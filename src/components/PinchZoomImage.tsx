import { useState, useRef, useCallback, useEffect } from "react";

interface PinchZoomImageProps {
  src: string;
  alt: string;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function PinchZoomImage({ src, alt, className = "", onSwipeLeft, onSwipeRight }: PinchZoomImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Touch tracking
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const positionStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Swipe tracking
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(null);

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  const getDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const getCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDistance.current = getDistance(e.touches);
      lastTouchCenter.current = getCenter(e.touches);
      swipeStart.current = null; // Cancel swipe if pinching
    } else if (e.touches.length === 1) {
      // Track swipe start for all single touches
      swipeStart.current = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY,
        time: Date.now()
      };
      
      if (scale > 1) {
        setIsDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        positionStart.current = { ...position };
      }
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      const scaleFactor = newDistance / lastTouchDistance.current;
      
      setScale(prevScale => {
        const newScale = Math.min(Math.max(prevScale * scaleFactor, 1), 5);
        // Reset position if zooming back to 1
        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newScale;
      });
      
      lastTouchDistance.current = newDistance;
    } else if (e.touches.length === 1 && isDragging && dragStart.current && scale > 1) {
      const deltaX = e.touches[0].clientX - dragStart.current.x;
      const deltaY = e.touches[0].clientY - dragStart.current.y;
      
      // Limit panning based on scale
      const maxPan = (scale - 1) * 100;
      setPosition({
        x: Math.min(Math.max(positionStart.current.x + deltaX, -maxPan), maxPan),
        y: Math.min(Math.max(positionStart.current.y + deltaY, -maxPan), maxPan),
      });
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Check for swipe gesture when not zoomed
    if (scale === 1 && swipeStart.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - swipeStart.current.x;
      const deltaY = touch.clientY - swipeStart.current.y;
      const deltaTime = Date.now() - swipeStart.current.time;
      
      const SWIPE_THRESHOLD = 50; // minimum distance
      const SWIPE_TIME_LIMIT = 300; // maximum time in ms
      const VERTICAL_TOLERANCE = 100; // max vertical movement
      
      if (
        deltaTime < SWIPE_TIME_LIMIT && 
        Math.abs(deltaX) > SWIPE_THRESHOLD && 
        Math.abs(deltaY) < VERTICAL_TOLERANCE
      ) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    }
    
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsDragging(false);
    dragStart.current = null;
    swipeStart.current = null;
  }, [scale, onSwipeLeft, onSwipeRight]);

  // Double tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
    }
    lastTap.current = now;
  }, [scale]);

  // Mouse wheel zoom for desktop
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prevScale => {
      const newScale = Math.min(Math.max(prevScale * delta, 1), 5);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden touch-none select-none ${className}`}
      onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="max-h-[80vh] max-w-full object-contain transition-transform duration-100"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
        }}
        draggable={false}
      />
      {scale > 1 && (
        <div className="absolute top-3 left-3 rounded-full bg-white/20 px-2 py-1 text-xs text-white">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}