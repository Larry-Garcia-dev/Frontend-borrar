"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Calendar, ChevronRight, Check, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GeneratedMedia } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { ProtectedImage } from "@/components/protected-image";
import { cn } from "@/lib/utils";

export interface SessionGroup {
  sessionId: string;
  prompt: string;
  images: GeneratedMedia[];
  createdAt: string;
  approvedCount: number;
}

interface SessionCardProps {
  session: SessionGroup;
  onOpenSession: (session: SessionGroup) => void;
  index: number;
}

export function SessionCard({ session, onOpenSession, index }: SessionCardProps) {
  const previewImages = session.images.slice(0, 4);
  const totalImages = session.images.length;
  const hasMoreImages = totalImages > 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Card 
        className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
        onClick={() => onOpenSession(session)}
      >
        {/* Grid de preview - Muestra hasta 4 imágenes */}
        <div className="relative aspect-square">
          <div className={cn(
            "grid h-full w-full gap-0.5",
            totalImages === 1 ? "grid-cols-1" :
            totalImages === 2 ? "grid-cols-2" :
            "grid-cols-2 grid-rows-2"
          )}>
            {previewImages.map((image, idx) => (
              <div 
                key={image.id} 
                className={cn(
                  "relative overflow-hidden",
                  totalImages === 1 && "col-span-1",
                  totalImages === 2 && "col-span-1",
                  totalImages === 3 && idx === 0 && "row-span-2",
                )}
              >
                <ProtectedImage
                  src={image.storage_url}
                  alt={image.prompt}
                  className="h-full w-full object-cover"
                  isApproved={image.is_approved}
                  watermarkText="PROTEGIDO"
                />
                {!image.is_approved && idx === 0 && (
                  <div className="absolute right-2 top-2 rounded-full bg-amber-500/90 p-1 shadow-lg">
                    <Lock className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Overlay con cantidad si hay más imágenes */}
          {hasMoreImages && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-white flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              +{totalImages - 4} más
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 flex items-end justify-center pb-4">
            <span className="flex items-center gap-1 text-white text-sm font-medium">
              Ver todas <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Prompt truncado */}
          <p className="line-clamp-2 text-sm font-medium text-foreground mb-3">
            {session.prompt}
          </p>

          {/* Metadatos */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(session.createdAt)}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {totalImages}
              </span>
              {session.approvedCount > 0 && (
                <span className="flex items-center gap-1 text-green-500">
                  <Check className="h-3 w-3" />
                  {session.approvedCount}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Función helper para agrupar imágenes por sesión
export function groupImagesBySession(images: GeneratedMedia[]): SessionGroup[] {
  const groups: Map<string, SessionGroup> = new Map();

  images.forEach((image) => {
    // Usar los primeros 50 caracteres del prompt + minuto de creación como key de sesión
    const promptKey = image.prompt.substring(0, 50).trim();
    const dateKey = image.created_at.substring(0, 16); // YYYY-MM-DDTHH:MM
    const sessionKey = `${promptKey}-${dateKey}`;

    if (groups.has(sessionKey)) {
      const group = groups.get(sessionKey)!;
      group.images.push(image);
      if (image.is_approved) {
        group.approvedCount++;
      }
    } else {
      groups.set(sessionKey, {
        sessionId: sessionKey,
        prompt: image.prompt,
        images: [image],
        createdAt: image.created_at,
        approvedCount: image.is_approved ? 1 : 0,
      });
    }
  });

  // Ordenar imágenes dentro de cada grupo por fecha
  groups.forEach((group) => {
    group.images.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  // Convertir a array y ordenar por fecha del grupo más reciente
  return Array.from(groups.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
