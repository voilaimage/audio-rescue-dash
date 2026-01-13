import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Check, X } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  maxSizeKB?: number;
}

export function ImageCropper({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
  maxSizeKB = 500,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imageRef.current = e.currentTarget;
    setImageLoaded(true);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const compressImage = async (canvas: HTMLCanvasElement, maxKB: number): Promise<Blob> => {
    let quality = 0.9;
    let blob: Blob | null = null;

    while (quality > 0.1) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
      });

      if (blob && blob.size <= maxKB * 1024) {
        return blob;
      }
      quality -= 0.1;
    }

    // If still too large, reduce dimensions
    const scale = Math.sqrt((maxKB * 1024) / (blob?.size || maxKB * 1024 * 2));
    const newCanvas = document.createElement("canvas");
    newCanvas.width = canvas.width * scale;
    newCanvas.height = canvas.height * scale;
    const ctx = newCanvas.getContext("2d");
    ctx?.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);

    return new Promise<Blob>((resolve, reject) => {
      newCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to compress image"));
        },
        "image/jpeg",
        0.8
      );
    });
  };

  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 400; // Output 400x400 for avatars
    canvas.width = outputSize;
    canvas.height = outputSize / aspectRatio;

    const img = imageRef.current;
    const containerSize = 280;
    const imgScale = Math.max(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const drawWidth = img.naturalWidth * imgScale * (outputSize / containerSize);
    const drawHeight = img.naturalHeight * imgScale * (outputSize / containerSize);
    const offsetX = (position.x / containerSize) * outputSize;
    const offsetY = (position.y / containerSize) * outputSize;

    ctx.drawImage(
      img,
      -drawWidth / 2 + offsetX,
      -drawHeight / 2 + offsetY,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    try {
      const blob = await compressImage(canvas, maxSizeKB);
      onCropComplete(blob);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#1d1d1d] border-[#555555]">
        <DialogHeader>
          <DialogTitle className="text-white">Crop Photo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Crop Area */}
          <div
            className="relative mx-auto overflow-hidden rounded-full bg-black"
            style={{ width: 280, height: 280 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <img
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              className="absolute cursor-move select-none"
              style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) rotate(${rotation}deg) scale(${zoom})`,
                left: "50%",
                top: "50%",
                maxWidth: "none",
                transformOrigin: "center center",
              }}
              draggable={false}
            />
            {/* Grid overlay */}
            <div className="pointer-events-none absolute inset-0 border-2 border-white/50 rounded-full" />
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom Control */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-gray-400" />
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-gray-400" />
            </div>

            {/* Rotate Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleRotate}
              className="w-full border-[#555555] text-white hover:bg-[#28292b]"
            >
              <RotateCw className="mr-2 h-4 w-4" /> Rotate 90°
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[#555555] text-white hover:bg-[#28292b]"
            >
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCrop}
              disabled={!imageLoaded}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" /> Apply
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Drag to reposition • Image will be compressed to {maxSizeKB}KB
          </p>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
