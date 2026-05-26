/**
 * EJEMPLO: Componente para mostrar la lista de estudios
 * 
 * Este archivo es un ejemplo de cómo usar la funcionalidad de obtener datos
 * de estudios desde el backend.
 * 
 * Uso:
 * - Importa este componente en tu página admin
 * - Usa el hook useAdminStore para acceder a los datos
 * - Llamar a fetchStudios() para obtener la lista de estudios
 */

"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/lib/store/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StudiosListExample() {
  const { studios, isLoadingStudios, error, fetchStudios, fetchStudioInfo } = useAdminStore();

  // Obtener la lista de estudios cuando se monta el componente
  useEffect(() => {
    fetchStudios();
  }, [fetchStudios]);

  // Manejar el evento de click en un estudio para obtener detalles
  const handleViewStudio = async (studioId: string) => {
    await fetchStudioInfo(studioId);
    // Aquí puedes abrir un modal o navegar a una página de detalles
    console.log(`Abriendo detalles del estudio: ${studioId}`);
  };

  if (isLoadingStudios) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Cargando estudios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (studios.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
        <p className="text-gray-600">No hay estudios registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {studios.map((studio) => (
          <Card key={studio.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{studio.name || studio.email}</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  studio.is_active 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {studio.is_active ? "Activo" : "Inactivo"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-medium">{studio.email}</p>
                </div>
                <div>
                  <p className="text-gray-600">Modelos</p>
                  <p className="font-medium">{studio.models_count}</p>
                </div>
                <div>
                  <p className="text-gray-600">Límite Diario</p>
                  <p className="font-medium">
                    {studio.is_unlimited ? "Ilimitado" : `${studio.daily_limit}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Cuota Usada</p>
                  <p className="font-medium">{studio.used_quota}</p>
                </div>
                <div>
                  <p className="text-gray-600">Límite de Modelos</p>
                  <p className="font-medium">{studio.max_models_limit}</p>
                </div>
                <div>
                  <p className="text-gray-600">Creado</p>
                  <p className="font-medium">
                    {studio.created_at 
                      ? new Date(studio.created_at).toLocaleDateString() 
                      : "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewStudio(studio.id)}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


// ============================================================
// EJEMPLO: Componente para mostrar detalles de un estudio
// ============================================================

export function StudioDetailExample() {
  const { studioInfo, isLoadingStudio, error, clearStudioInfo } = useAdminStore();

  if (!studioInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Detalles del Estudio</CardTitle>
          <button
            onClick={clearStudioInfo}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingStudio ? (
            <p>Cargando detalles...</p>
          ) : error ? (
            <p className="text-red-600">Error: {error}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Nombre</p>
                <p className="font-medium">{studioInfo.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="font-medium">{studioInfo.email}</p>
              </div>
              <div>
                <p className="text-gray-600">Rol</p>
                <p className="font-medium">{studioInfo.role}</p>
              </div>
              <div>
                <p className="text-gray-600">Estado</p>
                <p className="font-medium">
                  {studioInfo.is_active ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Modelos bajo este estudio</p>
                <p className="font-medium">{studioInfo.models_count}</p>
              </div>
              <div>
                <p className="text-gray-600">Límite Diario</p>
                <p className="font-medium">
                  {studioInfo.is_unlimited ? "Ilimitado" : studioInfo.daily_limit}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Cuota Usada / Total</p>
                <p className="font-medium">
                  {studioInfo.used_quota} / {studioInfo.daily_limit}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Máx. Modelos Permitidos</p>
                <p className="font-medium">{studioInfo.max_models_limit}</p>
              </div>
              <div>
                <p className="text-gray-600">Creado en</p>
                <p className="font-medium">
                  {studioInfo.created_at
                    ? new Date(studioInfo.created_at).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={clearStudioInfo}
            >
              Cerrar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
