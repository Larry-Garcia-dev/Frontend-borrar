"use client";

import { motion } from "framer-motion";
import { Image as ImageIcon, Calendar, ChevronRight, Check, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GeneratedMedia } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { ProtectedImage } from "@/components/protected-image";

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
  const totalImages = session.images.length;
  // Usar la primera imagen (más reciente) como imagen de portada
  const coverImage = session.images[0];

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
        {/* Imagen de portada única */}
        <div className="relative aspect-square">
          <ProtectedImage
            src={coverImage.storage_url}
            alt={coverImage.prompt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            isApproved={coverImage.is_approved}
            watermarkText="PROTEGIDO"
          />

          {/* Indicador de estado de la imagen de portada */}
          {!coverImage.is_approved && (
            <div className="absolute right-3 top-3 rounded-full bg-amber-500/90 p-1.5 shadow-lg">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
          )}

          {/* Badge con cantidad de imágenes */}
          {totalImages > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-medium text-white flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4" />
              {totalImages}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 flex items-end justify-center pb-4">
            <span className="flex items-center gap-1 text-white text-sm font-medium">
              Ver {totalImages > 1 ? `todas (${totalImages})` : "imagen"} <ChevronRight className="h-4 w-4" />
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
              {totalImages > 1 && (
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {totalImages}
                </span>
              )}
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
// Agrupa por prompt exacto (normalizado) y ventana de tiempo de 5 minutos
export function groupImagesBySession(images: GeneratedMedia[]): SessionGroup[] {
  const groups: Map<string, SessionGroup> = new Map();

  // Ordenar imágenes por fecha de creación (más antigua primero para la agrupación)
  const sortedImages = [...images].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedImages.forEach((image) => {
    // Normalizar el prompt (trim y lowercase para comparación)
    const normalizedPrompt = image.prompt.trim().toLowerCase();
    
    // Buscar un grupo existente con el mismo prompt y dentro de ventana de tiempo
    let foundGroup: SessionGroup | null = null;
    const imageTime = new Date(image.created_at).getTime();
    
    for (const group of groups.values()) {
      const groupPromptNormalized = group.prompt.trim().toLowerCase();
      if (groupPromptNormalized === normalizedPrompt) {
        // Verificar si está dentro de 5 minutos de cualquier imagen del grupo
        const groupTimes = group.images.map(img => new Date(img.created_at).getTime());
        const minTime = Math.min(...groupTimes);
        const maxTime = Math.max(...groupTimes);
        
        // Ventana de 5 minutos (300000 ms)
        if (imageTime >= minTime - 300000 && imageTime <= maxTime + 300000) {
          foundGroup = group;
          break;
        }
      }
    }

    if (foundGroup) {
      foundGroup.images.push(image);
      if (image.is_approved) {
        foundGroup.approvedCount++;
      }
    } else {
      // Crear nuevo grupo usando el prompt original (con capitalización original)
      const sessionKey = `${image.prompt}-${image.created_at}`;
      groups.set(sessionKey, {
        sessionId: sessionKey,
        prompt: image.prompt,
        images: [image],
        createdAt: image.created_at,
        approvedCount: image.is_approved ? 1 : 0,
      });
    }
  });

  // Ordenar imágenes dentro de cada grupo por fecha (más reciente primero)
  groups.forEach((group) => {
    group.images.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    // Actualizar createdAt con la fecha más reciente del grupo
    group.createdAt = group.images[0].created_at;
  });

  // Convertir a array y ordenar por fecha del grupo más reciente
  return Array.from(groups.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
