"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useGenerationStore } from "@/lib/store/generation-store";
import { GeneratedMedia } from "@/lib/api-client";

// Importamos los sub-componentes
import { GalleryFilters } from "@/components/gallery/gallery-filters";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { ImageDetailModal } from "@/components/gallery/image-detail-modal";
import { ReportModal } from "@/components/gallery/report-modal";

export default function GalleryPage() {
  const router = useRouter();
  const { generations, fetchGenerations, isLoading, startEdit, setPrompt, approveMedia } = useGenerationStore();
  
  // Estados Locales
  const [selectedImage, setSelectedImage] = useState<GeneratedMedia | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMediaId, setReportingMediaId] = useState<string | null>(null);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Lógica de Filtrado y Ordenamiento
  const filteredImages = generations
    .filter((img) => img.prompt.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Manejadores de Eventos
  const handleEdit = (image: GeneratedMedia) => {
    setPrompt(`Editar: ${image.prompt}`);
    startEdit(image.id, image.edit_count);
    router.push("/dashboard");
  };

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

      <GalleryFilters 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        sortOrder={sortOrder} 
        setSortOrder={setSortOrder} 
      />

      <GalleryGrid 
        isLoading={isLoading} 
        images={filteredImages} 
        searchTerm={searchTerm} 
        onSelectImage={setSelectedImage}
        onApprove={handleApprove}
      />

      <ImageDetailModal 
        image={selectedImage} 
        onClose={() => setSelectedImage(null)} 
        onApprove={handleApprove}
        onEdit={handleEdit}
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