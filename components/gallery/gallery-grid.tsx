"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Calendar, Lock, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeneratedMedia } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { ProtectedImage } from "@/components/protected-image";

interface GalleryGridProps {
  isLoading: boolean;
  images: GeneratedMedia[];
  searchTerm: string;
  onSelectImage: (image: GeneratedMedia) => void;
  onApprove: (mediaId: string) => void;
}

export function GalleryGrid({ isLoading, images, searchTerm, onSelectImage, onApprove }: GalleryGridProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-secondary">
          <ImageIcon className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold text-foreground">
          {searchTerm ? "No se encontraron resultados" : "Sin imágenes todavía"}
        </h3>
        <p className="mt-2 text-lg text-muted-foreground">
          {searchTerm ? "Intenta con otro término de búsqueda" : "Crea tu primera imagen desde el dashboard"}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {images.map((image, index) => (
        <motion.div
          key={image.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="group"
        >
          <Card className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 flex flex-col h-full">
            <div 
              className="relative aspect-square overflow-hidden cursor-pointer"
              onClick={() => onSelectImage(image)}
            >
              <ProtectedImage
                src={image.storage_url}
                alt={image.prompt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                isApproved={image.is_approved}
                watermarkText="PROTEGIDO"
              />
              {!image.is_approved && (
                <div className="absolute right-2 top-2 rounded-full bg-amber-500/90 p-1.5 shadow-lg">
                  <Lock className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                <p className="line-clamp-2 text-sm text-white font-medium">{image.prompt}</p>
              </div>
            </div>
            
            <CardContent className="p-4 flex flex-col justify-between flex-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(image.created_at)}
                </div>
                <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                  {image.edit_count} edic.
                </span>
              </div>
              
              {/* Botón directo de aprobar si no está aprobada */}
              {!image.is_approved && (
                <Button 
                  variant="outline" 
                  className="w-full mt-auto border-amber-500/50 text-amber-500 hover:bg-amber-500/10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(image.id);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" /> Aprobar ahora
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}