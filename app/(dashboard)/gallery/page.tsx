"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Download,
  X,
  Calendar,
  Search,
  SlidersHorizontal,
  Edit3,
  Flag,
  Check,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGenerationStore } from "@/lib/store/generation-store";
import { GeneratedMedia } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { ProtectedImage } from "@/components/protected-image";

export default function GalleryPage() {
  const router = useRouter();
  const {
    generations,
    fetchGenerations,
    isLoading,
    startEdit,
    reportMedia,
  } = useGenerationStore();
  const [selectedImage, setSelectedImage] = useState<GeneratedMedia | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  // Remove the local approval state tracking

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  const filteredImages = generations
    .filter((img) =>
      img.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const handleEdit = (image: GeneratedMedia) => {
    startEdit(image.id, image.edit_count);
    setSelectedImage(null);
    router.push("/dashboard");
  };

  const handleOpenReport = () => {
    setReportReason("");
    setReportSuccess(false);
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedImage || !reportReason.trim()) return;
    setIsSubmittingReport(true);
    try {
      await reportMedia(selectedImage.id, reportReason.trim());
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
      }, 1500);
    } catch {
      // Error handled by store
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Remove the handleApprove function since we're using the store's function directly

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-foreground">Tu Galeria</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Todas tus creaciones en un solo lugar
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="relative max-w-md flex-1">
          <Input
            type="text"
            placeholder="Buscar por prompt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-5 w-5" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="rounded-lg border border-border bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="newest">Mas recientes</option>
            <option value="oldest">Mas antiguas</option>
          </select>
        </div>
      </motion.div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredImages.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-secondary">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold text-foreground">
            {searchTerm ? "No se encontraron resultados" : "Sin imagenes todavia"}
          </h3>
          <p className="mt-2 text-lg text-muted-foreground">
            {searchTerm
              ? "Intenta con otro termino de busqueda"
              : "Crea tu primera imagen desde el dashboard"}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <Card className="overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                <div className="relative aspect-square overflow-hidden">
                  <ProtectedImage
                    src={image.storage_url}
                    alt={image.prompt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    isApproved={image.is_approved}
                    watermarkText="PROTEGIDO"
                  />
                  {/* Lock indicator for non-approved images */}
                  {!image.is_approved && (
                    <div className="absolute right-2 top-2 rounded-full bg-amber-500/90 p-1.5">
                      <Lock className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="line-clamp-2 text-sm text-white">{image.prompt}</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(image.created_at)}
                    </div>
                    <span className="rounded bg-secondary px-2 py-0.5 text-xs">
                      {image.edit_count} ediciones
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && !showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="grid md:grid-cols-2">
                {/* Image */}
                <div className="relative aspect-square bg-black">
                  <ProtectedImage
                    src={selectedImage.storage_url}
                    alt={selectedImage.prompt}
                    className="h-full w-full object-contain"
                    isApproved={selectedImage.is_approved}
                    watermarkText="PENDIENTE DE APROBACION"
                  />
                </div>

                {/* Details */}
                <div className="flex flex-col p-6">
                  <h3 className="mb-4 text-2xl font-bold text-foreground">
                    Detalles de la imagen
                  </h3>

                  <div className="flex-1 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Prompt</p>
                      <p className="mt-1 text-base text-foreground">
                        {selectedImage.prompt}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-secondary p-3">
                        <p className="text-xs text-muted-foreground">Tipo</p>
                        <p className="text-base font-medium text-foreground">
                          {selectedImage.media_type}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary p-3">
                        <p className="text-xs text-muted-foreground">Ediciones</p>
                        <p className="text-base font-medium text-foreground">
                          {selectedImage.edit_count}
                        </p>
                      </div>
                      <div className="col-span-2 rounded-lg bg-secondary p-3">
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="text-base font-medium text-foreground">
                          {formatDate(selectedImage.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Approval notice */}
                    {!selectedImage.is_approved && (
                      <div className="rounded-xl bg-amber-500/10 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                          <div>
                            <p className="font-medium text-foreground">
                              Imagen protegida
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Debes aprobar la imagen antes de poder descargarla.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-6 space-y-3">
                    {!selectedImage.is_approved ? (
                      <div className="rounded-xl bg-amber-500/10 p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              Imagen protegida
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Debes aprobar la imagen antes de poder descargarla.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => useGenerationStore.getState().approveMedia(selectedImage.id)}
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Aprobar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleOpenReport}
                              >
                                <Flag className="mr-1 h-3 w-3" />
                                Reportar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="gradient"
                          className="w-full"
                          onClick={() => handleDownload(selectedImage)}
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Descargar
                        </Button>
                        <div className="flex gap-3">
                          <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => handleEdit(selectedImage)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={handleOpenReport}
                          >
                            <Flag className="mr-2 h-4 w-4" />
                            Reportar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              {reportSuccess ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Reporte enviado
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    Gracias por tu retroalimentacion. Revisaremos tu reporte.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                      <Flag className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">
                        Reportar imagen
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Describe el problema con esta imagen
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Ej: La imagen no corresponde al prompt, tiene errores visuales, etc."
                    className="h-32 w-full resize-none rounded-xl border-2 border-input bg-card p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowReportModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleSubmitReport}
                      disabled={!reportReason.trim() || isSubmittingReport}
                      isLoading={isSubmittingReport}
                    >
                      Enviar reporte
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
