"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Globe, Bell, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    siteName: "Macondo AI",
    defaultQuota: 100,
    maxImageSize: 1024,
    enableRegistration: true,
    requireEmailVerification: false,
    maintenanceMode: false,
    notifyOnNewUser: true,
    notifyOnQuotaExceeded: true,
  });

  const handleSave = () => {
    // Save settings to API
    alert("Configuracion guardada correctamente");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground">Configuracion</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Ajustes generales de la plataforma
          </p>
        </div>
        <Button variant="gradient" size="lg" onClick={handleSave}>
          <Save className="h-5 w-5" />
          Guardar Cambios
        </Button>
      </motion.div>

      {/* Settings Sections */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Globe className="h-5 w-5 text-primary" />
                General
              </CardTitle>
              <CardDescription>Configuracion basica de la aplicacion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input
                label="Nombre del sitio"
                value={settings.siteName}
                onChange={(e) =>
                  setSettings({ ...settings, siteName: e.target.value })
                }
              />
              <Input
                label="Cuota predeterminada para nuevos usuarios"
                type="number"
                value={settings.defaultQuota}
                onChange={(e) =>
                  setSettings({ ...settings, defaultQuota: Number(e.target.value) })
                }
              />
              <Input
                label="Tamano maximo de imagen (px)"
                type="number"
                value={settings.maxImageSize}
                onChange={(e) =>
                  setSettings({ ...settings, maxImageSize: Number(e.target.value) })
                }
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Shield className="h-5 w-5 text-primary" />
                Seguridad
              </CardTitle>
              <CardDescription>Opciones de seguridad y acceso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ToggleOption
                label="Permitir registro de usuarios"
                description="Los usuarios pueden crear cuentas nuevas"
                checked={settings.enableRegistration}
                onChange={(checked) =>
                  setSettings({ ...settings, enableRegistration: checked })
                }
              />
              <ToggleOption
                label="Verificacion de email requerida"
                description="Los usuarios deben verificar su email"
                checked={settings.requireEmailVerification}
                onChange={(checked) =>
                  setSettings({ ...settings, requireEmailVerification: checked })
                }
              />
              <ToggleOption
                label="Modo mantenimiento"
                description="Solo administradores pueden acceder"
                checked={settings.maintenanceMode}
                onChange={(checked) =>
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Bell className="h-5 w-5 text-primary" />
                Notificaciones
              </CardTitle>
              <CardDescription>Configuracion de alertas y avisos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ToggleOption
                label="Notificar nuevos usuarios"
                description="Recibir alerta cuando se registra un usuario"
                checked={settings.notifyOnNewUser}
                onChange={(checked) =>
                  setSettings({ ...settings, notifyOnNewUser: checked })
                }
              />
              <ToggleOption
                label="Alerta de cuota excedida"
                description="Notificar cuando un usuario excede su cuota"
                checked={settings.notifyOnQuotaExceeded}
                onChange={(checked) =>
                  setSettings({ ...settings, notifyOnQuotaExceeded: checked })
                }
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Appearance Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Palette className="h-5 w-5 text-primary" />
                Apariencia
              </CardTitle>
              <CardDescription>Personalizacion visual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-base font-medium text-foreground">
                  Color primario
                </label>
                <div className="mt-3 flex gap-3">
                  {["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b"].map(
                    (color) => (
                      <button
                        key={color}
                        className={cn(
                          "h-10 w-10 rounded-xl border-2 border-transparent transition-all hover:scale-110",
                          color === "#6366f1" && "ring-2 ring-white ring-offset-2 ring-offset-background"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-foreground">
                  Tema de la aplicacion
                </label>
                <div className="mt-3 flex gap-3">
                  <button className="flex-1 rounded-xl border-2 border-primary bg-primary/10 px-4 py-3 font-medium text-primary">
                    Oscuro
                  </button>
                  <button className="flex-1 rounded-xl border-2 border-border bg-secondary px-4 py-3 font-medium text-muted-foreground">
                    Claro
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-secondary"
        )}
      >
        <motion.div
          animate={{ x: checked ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
        />
      </button>
    </div>
  );
}
