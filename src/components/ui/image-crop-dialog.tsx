"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  imageUrl: string;
  onCrop: (croppedDataUrl: string) => void;
  onClose: () => void;
}

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 500;

export function ImageCropDialog({ open, imageUrl, onCrop, onClose }: ImageCropDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Reset controls when a new image is loaded
  useEffect(() => {
    if (open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImageLoaded(false);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => {
        imageRef.current = img;
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
      };
    }
  }, [open, imageUrl]);

  // Compute base dimensions to cover the viewport
  const baseScale = naturalSize.width > 0 && naturalSize.height > 0
    ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
    : 1;

  const currentWidth = naturalSize.width * baseScale * zoom;
  const currentHeight = naturalSize.height * baseScale * zoom;

  // Max drag boundaries so image doesn't completely leave the viewport
  const maxOffsetX = Math.max(0, (currentWidth - VIEWPORT_SIZE) / 2) + 40;
  const maxOffsetY = Math.max(0, (currentHeight - VIEWPORT_SIZE) / 2) + 40;

  const clampOffset = useCallback((x: number, y: number) => {
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    };
  }, [maxOffsetX, maxOffsetY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(offsetStart.current.x + dx, offsetStart.current.y + dy));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile / tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetStart.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setOffset(clampOffset(offsetStart.current.x + dx, offsetStart.current.y + dy));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApplyCrop = () => {
    if (!imageRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const drawWidth = currentWidth * ratio;
    const drawHeight = currentHeight * ratio;
    const drawX = (OUTPUT_SIZE - drawWidth) / 2 + offset.x * ratio;
    const drawY = (OUTPUT_SIZE - drawHeight) / 2 + offset.y * ratio;

    ctx.drawImage(imageRef.current, drawX, drawY, drawWidth, drawHeight);

    const croppedUrl = canvas.toDataURL("image/jpeg", 0.92);
    onCrop(croppedUrl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-display">Adjust & Crop Photo</DialogTitle>
          <p className="text-xs text-secondary-foreground">
            Drag photo to center the face. Use zoom slider to fit.
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-3">
          {/* Crop Container */}
          <div
            className="relative overflow-hidden rounded-lg bg-neutral-900 select-none shadow-inner border border-neutral-300"
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* The Scaled & Positioned Image */}
            {imageLoaded && (
              <img
                src={imageUrl}
                alt="Crop preview"
                draggable={false}
                className="absolute pointer-events-none transition-transform duration-75 ease-out"
                style={{
                  width: `${currentWidth}px`,
                  height: `${currentHeight}px`,
                  left: `${(VIEWPORT_SIZE - currentWidth) / 2 + offset.x}px`,
                  top: `${(VIEWPORT_SIZE - currentHeight) / 2 + offset.y}px`,
                  maxWidth: "none",
                }}
              />
            )}

            {/* Circular Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <svg width="100%" height="100%" viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}>
                <defs>
                  <mask id="circle-cutout">
                    <rect width="100%" height="100%" fill="white" />
                    <circle cx={VIEWPORT_SIZE / 2} cy={VIEWPORT_SIZE / 2} r={VIEWPORT_SIZE / 2 - 4} fill="black" />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.55)" mask="url(#circle-cutout)" />
                <circle
                  cx={VIEWPORT_SIZE / 2}
                  cy={VIEWPORT_SIZE / 2}
                  r={VIEWPORT_SIZE / 2 - 4}
                  fill="none"
                  stroke="#D71920"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </svg>
            </div>

            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded flex items-center gap-1 pointer-events-none">
              <Move className="w-3 h-3" /> Drag to move
            </div>
          </div>

          {/* Zoom Slider & Controls */}
          <div className="w-full space-y-2 px-2">
            <div className="flex items-center justify-between text-xs text-secondary-foreground">
              <span className="flex items-center gap-1"><ZoomOut className="w-3.5 h-3.5" /> Zoom</span>
              <span className="font-semibold text-neutral-800">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-[#D71920]"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Reset Position"
                className="text-xs h-7 px-2 shrink-0 text-secondary-foreground"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApplyCrop}>
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
