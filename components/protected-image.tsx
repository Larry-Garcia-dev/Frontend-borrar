"use client";

import { useState, useRef, useEffect } from "react";

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  isApproved?: boolean;
  watermarkText?: string;
}

export function ProtectedImage({
  src,
  alt,
  className = "",
  isApproved = false,
  watermarkText = "PENDIENTE DE APROBACION",
}: ProtectedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isApproved) return; // No need for canvas protection if approved

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Add watermark overlay
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Add watermark text diagonally
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(canvas.width / 15, 24)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Rotate and draw watermark multiple times
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(-Math.PI / 6); // -30 degrees

      for (let y = -canvas.height; y < canvas.height * 2; y += 150) {
        for (let x = -canvas.width; x < canvas.width * 2; x += 400) {
          ctx.fillText(watermarkText, x - centerX, y - centerY);
        }
      }
      ctx.restore();

      setIsLoaded(true);
    };
    img.onerror = () => {
      setIsLoaded(true);
    };
    img.src = src;
  }, [src, isApproved, watermarkText]);

  // Prevent context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isApproved) {
      e.preventDefault();
      return false;
    }
  };

  // Prevent drag
  const handleDragStart = (e: React.DragEvent) => {
    if (!isApproved) {
      e.preventDefault();
      return false;
    }
  };

  // If approved, show normal image
  if (isApproved) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        draggable={true}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Canvas with watermark - this is what gets saved if someone tries to screenshot */}
      <canvas
        ref={canvasRef}
        className={`h-full w-full object-contain ${!isLoaded ? "opacity-0" : "opacity-100"}`}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none",
        }}
      />

      {/* Invisible overlay to block all interactions */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      />

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
