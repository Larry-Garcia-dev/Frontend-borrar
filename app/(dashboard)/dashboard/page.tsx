"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Download,
  RefreshCw,
  Wand2,
  Image as ImageIcon,
  Upload,
  X,
  Flag,
  Edit3,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticleLoader } from "@/components/ui/particle-loader";
import { useGenerationStore } from "@/lib/store/generation-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { ProtectedImage } from "@/components/protected-image";

// Size presets matching the legacy frontend
const SIZE_OPTIONS = [
  { value: "1080x1080 (1:1)", label: "1080 x 1080 (Carrusel/Cuadrado 1:1)", width: 1080, height: 1080 },
  { value: "1080x1350 (4:5)", label: "1080 x 1350 (Vertical 4:5)", width: 1080, height: 1350 },
  { value: "1200x630 (16:9)", label: "1200 x 630 (Horizontal 16:9)", width: 1200, height: 630 },
  { value: "100x100 (1:1)", label: "100 x 100 (Destacado/Icono)", width: 100, height: 100 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    width,
    height,
    setWidth,
    setHeight,
    selectedSize,
    setSelectedSize,
    isGenerating,
    progress,
    currentGeneration,
    error,
    generate,
    clearError,
    promptTemplates,
    fetchPromptTemplates,
    templateId,
    setTemplateId,
    referenceImageUrls,
    setReferenceImageUrls,
    uploadReferenceImages,
    parentMediaId,
    parentEditCount,
    startEdit,
    cancelEdit,
    reportMedia,
    generations,
    fetchGenerations,
  } = useGenerationStore();

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportingMediaId, setReportingMediaId] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    fetchPromptTemplates();
    fetchGenerations();
  }, [fetchPromptTemplates, fetchGenerations]);

  const handleSizeChange = (value: string) => {
    setSelectedSize(value);
    const option = SIZE_OPTIONS.find((o) => o.value === value);
    if (option) {
      setWidth(option.width);
      setHeight(option.height);
    }
  };

  const handleTemplateChange = (templateName: string) => {
    if (templateName === "Sin plantilla" || !templateName) {
      setTemplateId(null);
      return;
    }
    const template = promptTemplates.find((t) => t.name === templateName);
    if (template) {
      setTemplateId(template.id);
    }
  };

  const handleGenerate = async () => {
    clearError();
    setIsApproved(false);
    await generate();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadReferenceImages(Array.from(files));
    }
    e.target.value = "";
  };

  const handleRemoveReference = (index: number) => {
    setReferenceImageUrls(referenceImageUrls.filter((_, i) => i !== index));
  };

  const handleOpenReport = (mediaId: string) => {
    setReportingMediaId(mediaId);
    setReportReason("");
    setReportSuccess(false);
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportingMediaId || !reportReason.trim()) return;
    setIsSubmittingReport(true);
    try {
      await reportMedia(reportingMediaId, reportReason.trim());
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportingMediaId(null);
      }, 1500);
    } catch {
      // Error handled by store
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleStartEdit = (mediaId: string, editCount: number) => {
    const media = generations.find((g) => g.id === mediaId);
    if (media) {
      setPrompt(`Editar: ${media.prompt}`);
      startEdit(mediaId, editCount);
    }
  };

  const handleApprove = () => {
    setIsApproved(true);
  };

  const handleDownload = () => {
    if (!currentGeneration || !isApproved) return;
    const link = document.createElement("a");
    link.href = currentGeneration.storage_url;
    link.download = `macondo-${currentGeneration.id}.png`;
    link.click();
  };

  const remainingCredits = user
    ? user.isUnlimited
      ? Infinity
      : user.dailyLimit - user.usedQuota
    : 0;

  // Edit mode state
  const isEditing = !!parentMediaId;
  const editsRemaining = Math.max(0, 2 - parentEditCount);
  const editIsFree = parentEditCount < 2;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-foreground">Genera tu imagen</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Describe lo que quieres crear y deja que la IA haga su magia
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Generation Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Wand2 className="h-6 w-6 text-primary" />
                  {isEditing ? "Editar imagen" : "Crear imagen"}
                </CardTitle>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {user?.isUnlimited ? "Ilimitado" : remainingCredits} creditos
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Edit mode banner */}
              {isEditing && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                  <div className="flex items-center gap-3">
                    <Edit3 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Modo edicion</p>
                      <p className="text-sm text-muted-foreground">
                        {editIsFree
                          ? `${editsRemaining} ediciones gratis restantes`
                          : "Esta edicion consumira 1 credito"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Template Selector */}
              {promptTemplates.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-base font-medium text-foreground">
                    Plantilla de estilo
                  </label>
                  <select
                    value={
                      templateId
                        ? promptTemplates.find((t) => t.id === templateId)?.name || ""
                        : "Sin plantilla"
                    }
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Sin plantilla">Sin plantilla</option>
                    {promptTemplates.map((template) => (
                      <option key={template.id} value={template.name}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {templateId && (
                    <p className="text-sm text-muted-foreground">
                      {promptTemplates.find((t) => t.id === templateId)?.description}
                    </p>
                  )}
                </div>
              )}

              {/* Prompt */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-foreground">
                  Describe tu imagen
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Un paisaje magico con montanas flotantes y auroras boreales..."
                  className="h-36 w-full resize-none rounded-xl border-2 border-input bg-card p-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Negative Prompt */}
              <div className="space-y-3">
                <label className="block text-base font-medium text-foreground">
                  Prompt negativo (opcional)
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Ej: borroso, baja calidad, texto, marcas de agua..."
                  className="h-20 w-full resize-none rounded-xl border-2 border-input bg-card p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Size Selector */}
              <div className="space-y-3">
                <label className="block text-base font-medium text-foreground">
                  Tamano de imagen
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => handleSizeChange(e.target.value)}
                  className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reference Images */}
              <div className="space-y-3">
                <label className="block text-base font-medium text-foreground">
                  Imagenes de referencia (opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {referenceImageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative h-16 w-16 overflow-hidden rounded-lg border border-border"
                    >
                      <img
                        src={url}
                        alt={`Reference ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveReference(index)}
                        className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {referenceImageUrls.length < 8 && (
                    <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximo 8 imagenes. PNG, JPG o WEBP.
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-destructive/10 p-4 text-center text-destructive"
                >
                  {error}
                </motion.div>
              )}

              {/* Generate Button */}
              <Button
                variant="gradient"
                size="xl"
                className="w-full"
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !prompt.trim() ||
                  (!user?.isUnlimited && !editIsFree && remainingCredits <= 0)
                }
                isLoading={isGenerating}
              >
                {!isGenerating && <Sparkles className="h-6 w-6" />}
                {isGenerating
                  ? "Generando..."
                  : isEditing
                    ? "Generar edicion"
                    : "Generar Imagen"}
              </Button>

              {!user?.isUnlimited && !editIsFree && remainingCredits <= 0 && (
                <p className="text-center text-sm text-destructive">
                  No tienes creditos disponibles. Contacta al administrador.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-secondary/50">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full items-center justify-center"
                    >
                      <ParticleLoader
                        message="Creando tu imagen..."
                        progress={progress}
                      />
                    </motion.div>
                  ) : currentGeneration ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative h-full"
                    >
                      <ProtectedImage
                        src={currentGeneration.storage_url}
                        alt={currentGeneration.prompt}
                        className="h-full w-full object-contain"
                        isApproved={isApproved}
                        watermarkText="PENDIENTE DE APROBACION"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20">
                        <ImageIcon className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">
                        Tu imagen aparecera aqui
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        Escribe un prompt y presiona generar
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons - only show after generation */}
              {currentGeneration && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-4"
                >
                  {/* Approval section */}
                  {!isApproved ? (
                    <div className="rounded-xl bg-amber-500/10 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            Revisa tu imagen antes de descargar
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Si la imagen no cumple con lo esperado, puedes
                            reportarla o editarla.
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleApprove}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Aprobar imagen
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                handleStartEdit(
                                  currentGeneration.id,
                                  currentGeneration.edit_count
                                )
                              }
                            >
                              <Edit3 className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenReport(currentGeneration.id)}
                            >
                              <Flag className="mr-2 h-4 w-4" />
                              Reportar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="gradient"
                        className="flex-1"
                        onClick={handleDownload}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Descargar imagen
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Generation info */}
                  <div className="rounded-xl bg-secondary/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Prompt utilizado:
                    </p>
                    <p className="mt-1 text-base text-foreground">
                      {currentGeneration.prompt}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-background px-2 py-1">
                        {width}x{height}
                      </span>
                      <span className="rounded-md bg-background px-2 py-1">
                        Ediciones: {currentGeneration.edit_count}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
