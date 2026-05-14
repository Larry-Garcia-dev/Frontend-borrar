"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useGenerationStore } from "@/lib/store/generation-store";
import { GeneratedMedia } from "@/lib/api-client";

// Importamos los sub-componentes
import { GalleryFilters } from "@/components/gallery/gallery-filters";
import { SessionCard, SessionGroup, groupImagesBySession } from "@/components/gallery/session-card";
import { SessionDetailModal } from "@/components/gallery/session-detail-modal";
import { ImageDetailModal } from "@/components/gallery/image-detail-modal";
import { ReportModal } from "@/components/gallery/report-modal";
import { Image as ImageIcon, Grid3X3, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "sessions" | "all";

export default function GalleryPage() {
  const { generations, fetchGenerations, isLoading, approveMedia } = useGenerationStore();
  
  // Estados Locales
  const [selectedImage, setSelectedImage] = useState<GeneratedMedia | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMediaId, setReportingMediaId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Lógica de Filtrado y Ordenamiento
  const filteredImages = useMemo(() => {
    return generations
      .filter((img) => img.prompt.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [generations, searchTerm, sortOrder]);

  // Agrupar imágenes por sesión
  const sessions = useMemo(() => {
    return groupImagesBySession(filteredImages);
  }, [filteredImages]);

  // Actualizar las sesiones cuando cambia el estado de aprobación
  useEffect(() => {
    if (selectedSession) {
      // Actualizar las imágenes de la sesión seleccionada
      const updatedImages = selectedSession.images.map(img => {
        const current = generations.find(g => g.id === img.id);
        return current || img;
      });
      const approvedCount = updatedImages.filter(i => i.is_approved).length;
      setSelectedSession({
        ...selectedSession,
        images: updatedImages,
        approvedCount,
      });
    }
  }, [generations]);

  // Manejadores de Eventos
  const handleOpenReport = (id: string) => {
    setReportingMediaId(id);
    setShowReportModal(true);
  };

  const handleApprove = (id: string) => {
    approveMedia(id);
    // Si el modal de la imagen está abierto, actualizamos el objeto para que desaparezca la marca
    if (selectedImage && selectedImage.id === id) {
      setSelectedImage({ ...selectedImage, is_approved: true });
    }
  };

  const handleDownload = (image: GeneratedMedia) => {
    if (!image.is_approved) return;
    const link = document.createElement("a");
    link.href = image.storage_url;
    link.download = `macondo-${image.id}.png`;
    link.click();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-4xl font-bold text-foreground">Tu Galería</h1>
        <p className="mt-2 text-lg text-muted-foreground">Todas tus creaciones en un solo lugar</p>
      </motion.div>

      {/* Filtros y Toggle de Vista */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <GalleryFilters 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
          sortOrder={sortOrder} 
          setSortOrder={setSortOrder} 
        />
        
        {/* Toggle de vista */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("sessions")}
            className={cn(
              "px-3 h-8",
              viewMode === "sessions" && "bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Sesiones
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("all")}
            className={cn(
              "px-3 h-8",
              viewMode === "all" && "bg-primary text-primary-foreground hover:bg-primary"
            )}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Todas
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredImages.length === 0 && (
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
      )}

      {/* Vista de Sesiones */}
      {!isLoading && viewMode === "sessions" && sessions.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((session, index) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              onOpenSession={setSelectedSession}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Vista de Todas las imágenes (grid tradicional) */}
      {!isLoading && viewMode === "all" && filteredImages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredImages.map((image, index) => (
            <motion.button
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => image.is_approved ? setSelectedImage(image) : handleApprove(image.id)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all group",
                image.is_approved
                  ? "border-green-500/30 hover:border-green-500"
                  : "border-amber-500/30 hover:border-amber-500"
              )}
            >
              <img
                src={image.storage_url}
                alt={image.prompt}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {!image.is_approved && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-medium px-3 py-1 rounded-full bg-amber-500/80">
                    Click para aprobar
                  </span>
                </div>
              )}
              {image.is_approved && (
                <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
                  <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Modal de Detalle de Sesión */}
      <SessionDetailModal 
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onApprove={handleApprove}
        onDownload={handleDownload}
        onSelectImage={setSelectedImage}
      />

      {/* Modal de Imagen Individual */}
      <ImageDetailModal 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onApprove={handleApprove}
        onReport={handleOpenReport}
        onDownload={handleDownload}
      />

      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
        mediaId={reportingMediaId} 
      />
    </div>
  );
}
