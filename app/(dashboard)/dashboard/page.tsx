"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useGenerationStore } from "@/lib/store/generation-store";
import { GenerationForm } from "@/components/dashboard/generation-form";
import { GenerationResult } from "@/components/dashboard/generation-result";
import { ReportModal } from "@/components/dashboard/report-modal";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { fetchPromptTemplates, fetchGenerations, generate } = useGenerationStore();

  // Estado maestro para reiniciar el formulario a su vista inicial (Selección de modelo)
  const [formKey, setFormKey] = useState(0);

  // Estado para el modal de reporte
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMediaId, setReportingMediaId] = useState<string | null>(null);

  useEffect(() => {
    fetchPromptTemplates();
    fetchGenerations();
  }, [fetchPromptTemplates, fetchGenerations]);

  const handleOpenReport = (mediaId: string) => {
    setReportingMediaId(mediaId);
    setShowReportModal(true);
  };

  const handleGenerateNew = async () => {
    await generate();
  };

  // Función que devuelve el GenerationForm a su estado inicial SIN recargar la página
  const handleResetForm = () => {
    setFormKey(prev => prev + 1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
      
      {/* Botón para volver a la selección de modelo/método */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetForm}
          className="text-muted-foreground hover:text-foreground -ml-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Cambiar Generacion
        </Button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-8"
      >
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground">Genera tu imagen</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-lg text-muted-foreground">
          Describe lo que quieres crear y deja que la IA haga su magia
        </p>
      </motion.div>

      {/* Grid Layout */}
      <div className="flex flex-col gap-4 sm:gap-8 lg:flex-row lg:gap-8">
        <GenerationForm 
          key={formKey} // Al cambiar este valor, el componente vuelve a la selección de modelo
          onGenerateStart={() => {}} 
        />
        
        <GenerationResult 
          onOpenReport={handleOpenReport}
          onGenerateNew={handleGenerateNew}
        />
      </div>

      {/* Modals */}
      <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
        mediaId={reportingMediaId} 
      />
    </div>
  );
}