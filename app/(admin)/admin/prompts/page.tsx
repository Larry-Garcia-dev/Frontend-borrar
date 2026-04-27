"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Plus, Trash2, Power, Loader2, Zap, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api, PromptTemplate, SystemPrompt } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminPromptsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"system" | "templates">("system");
  
  // States para System Prompts
  const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
  const [sysFormData, setSysFormData] = useState({ name: "", content: "" });
  
  // States para Templates
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [tplFormData, setTplFormData] = useState({ name: "", description: "", content: "", sort_order: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sysData, tplData] = await Promise.all([
        api.getAdminSystemPrompts(),
        api.getAdminPromptTemplates()
      ]);
      setSystemPrompts(sysData);
      setTemplates(tplData);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar los prompts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handlers para Prompt Base (System) ---
  const handleCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sysFormData.name.trim() || !sysFormData.content.trim()) return toast.error("Nombre y contenido requeridos");

    setIsSubmitting(true);
    try {
      await api.createSystemPrompt({ ...sysFormData, created_by: user?.email || "admin" });
      toast.success("Prompt Base creado exitosamente");
      setSysFormData({ name: "", content: "" });
      fetchData();
    } catch (error: any) { toast.error(error.message || "Error al crear el prompt base"); } 
    finally { setIsSubmitting(false); }
  };

  const handleActivateSystem = async (promptId: string) => {
    try {
      await api.activateSystemPrompt(promptId);
      toast.success("Prompt Base activado correctamente");
      fetchData();
    } catch (error: any) { toast.error("Error al activar el prompt"); }
  };

  const handleDeleteSystem = async (promptId: string) => {
    if (!confirm("¿Eliminar este prompt base permanentemente?")) return;
    try {
      await api.deleteSystemPrompt(promptId);
      toast.success("Prompt eliminado");
      fetchData();
    } catch (error: any) { toast.error("Error al eliminar el prompt"); }
  };

  // --- Handlers para Plantillas (Templates) ---
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplFormData.name.trim() || !tplFormData.content.trim()) return toast.error("Nombre y contenido requeridos");

    setIsSubmitting(true);
    try {
      await api.createPromptTemplate({ ...tplFormData, created_by: user?.email || "admin" });
      toast.success("Plantilla creada exitosamente");
      setTplFormData({ name: "", description: "", content: "", sort_order: 0 });
      fetchData();
    } catch (error: any) { toast.error(error.message || "Error al crear la plantilla"); } 
    finally { setIsSubmitting(false); }
  };

  const handleToggleTemplate = async (template: PromptTemplate) => {
    try {
      await api.togglePromptTemplateActive(template.id, !template.is_active);
      toast.success(`Plantilla ${!template.is_active ? "activada" : "desactivada"}`);
      fetchData();
    } catch (error: any) { toast.error("Error al actualizar la plantilla"); }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("¿Eliminar esta plantilla permanentemente?")) return;
    try {
      await api.deletePromptTemplate(templateId);
      toast.success("Plantilla eliminada");
      fetchData();
    } catch (error: any) { toast.error("Error al eliminar la plantilla"); }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Gestión de Prompts IA</h1>
          <p className="mt-2 text-lg text-muted-foreground">Administra el comportamiento base de la IA y las plantillas para los usuarios.</p>
        </div>

        {/* Pestañas */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("system")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "system" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings2 className="h-4 w-4" /> Prompt del Sistema
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "templates" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="h-4 w-4" /> Plantillas de Usuario
          </button>
        </div>
      </motion.div>

      {/* Contenido principal dividido en 2 columnas */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* COLUMNA IZQUIERDA: Formularios de creación */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> 
                {activeTab === "system" ? "Crear Prompt Base" : "Crear Plantilla"}
              </CardTitle>
              <CardDescription>
                {activeTab === "system" 
                  ? "Se inyectará de forma invisible en todas las generaciones." 
                  : "Los usuarios podrán seleccionarla como un estilo."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTab === "system" ? (
                <form onSubmit={handleCreateSystem} className="space-y-4">
                  <Input label="Nombre interno *" placeholder="Ej: V1 Fotorealista" value={sysFormData.name} onChange={(e) => setSysFormData({ ...sysFormData, name: e.target.value })} required />
                  <div className="space-y-2">
                    <label className="block text-base font-medium text-foreground">Instrucciones del Sistema *</label>
                    <Textarea placeholder="Ej: You are an expert photographer. Always use 8k resolution..." value={sysFormData.content} onChange={(e) => setSysFormData({ ...sysFormData, content: e.target.value })} className="h-40" required />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar Prompt Base"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleCreateTemplate} className="space-y-4">
                  <Input label="Nombre de la Plantilla *" placeholder="Ej: Estilo Anime" value={tplFormData.name} onChange={(e) => setTplFormData({ ...tplFormData, name: e.target.value })} required />
                  <Input label="Descripción" placeholder="Breve explicación..." value={tplFormData.description} onChange={(e) => setTplFormData({ ...tplFormData, description: e.target.value })} />
                  <div className="space-y-2">
                    <label className="block text-base font-medium text-foreground">Contenido del Prompt *</label>
                    <Textarea placeholder="Ej: anime style, studio ghibli, vibrant colors..." value={tplFormData.content} onChange={(e) => setTplFormData({ ...tplFormData, content: e.target.value })} className="h-32" required />
                  </div>
                  <Input label="Orden (0 es primero)" type="number" min={0} value={tplFormData.sort_order} onChange={(e) => setTplFormData({ ...tplFormData, sort_order: Number(e.target.value) })} />
                  <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar Plantilla"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* COLUMNA DERECHA: Listado de datos */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-4 relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === "system" && (
              <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {systemPrompts.length === 0 && !isLoading && (
                  <p className="text-center text-muted-foreground p-10 border rounded-xl bg-card">No hay prompts base configurados.</p>
                )}
                {systemPrompts.map((prompt) => (
                  <Card key={prompt.id} className={cn("transition-colors", prompt.is_active ? "border-green-500/50 bg-green-500/5" : "opacity-80 bg-card")}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-foreground">{prompt.name}</h3>
                            {prompt.is_active && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white flex items-center gap-1">
                                <Zap className="h-3 w-3" /> ACTIVO
                              </span>
                            )}
                          </div>
                          <div className="bg-secondary/70 p-4 rounded-lg mt-2 text-sm text-foreground/90 font-mono whitespace-pre-wrap">
                            {prompt.content}
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0 items-start border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4">
                          <Button variant={prompt.is_active ? "outline" : "default"} size="sm" className={cn("w-full sm:w-auto", !prompt.is_active && "bg-green-600 hover:bg-green-700 text-white")} disabled={prompt.is_active} onClick={() => handleActivateSystem(prompt.id)}>
                            <Zap className="h-4 w-4 mr-2" /> {prompt.is_active ? "En Uso" : "Activar"}
                          </Button>
                          <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => handleDeleteSystem(prompt.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            {activeTab === "templates" && (
              <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {templates.length === 0 && !isLoading && (
                  <p className="text-center text-muted-foreground p-10 border rounded-xl bg-card">No hay plantillas de usuario configuradas.</p>
                )}
                {templates.map((template) => (
                  <Card key={template.id} className={cn("transition-colors", !template.is_active && "opacity-70 bg-secondary/30")}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-foreground">{template.name}</h3>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", template.is_active ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground")}>
                              {template.is_active ? "Visible para usuarios" : "Oculta"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{template.description || "Sin descripción"}</p>
                          <div className="bg-secondary/50 p-3 rounded-lg mt-2 text-sm text-foreground/80 font-mono">
                            {template.content}
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0 items-start border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-4">
                          <Button variant={template.is_active ? "secondary" : "outline"} size="sm" className="w-full sm:w-auto" onClick={() => handleToggleTemplate(template)}>
                            <Power className={cn("h-4 w-4 mr-2", template.is_active ? "text-amber-500" : "text-green-500")} />
                            {template.is_active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}