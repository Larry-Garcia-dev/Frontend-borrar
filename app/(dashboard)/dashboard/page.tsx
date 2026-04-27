"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGenerationStore } from "@/lib/store/generation-store";
import { GenerationForm } from "@/components/dashboard/generation-form";
import { GenerationResult } from "@/components/dashboard/generation-result";
import { ReportModal } from "@/components/dashboard/report-modal";

export default function DashboardPage() {
  const { fetchPromptTemplates, fetchGenerations, generate } = useGenerationStore();

  // Estado que coordina la comunicación entre componentes
  const [isApproved, setIsApproved] = useState(false);
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
    setIsApproved(false);
    await generate();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
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
          onGenerateStart={() => setIsApproved(false)} 
        />
        
        <GenerationResult 
          isApproved={isApproved}
          onApprove={() => setIsApproved(true)}
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