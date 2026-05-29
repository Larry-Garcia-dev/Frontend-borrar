import { BaseAPIClient } from "./api/core";
import { createAuthApi } from "./api/auth";
import { createGenerationApi } from "./api/generation";
import { createAdminApi } from "./api/admin";
import { createVendorApi } from "./api/vendor";
import { createNotificationsApi } from "./api/notifications";
import { createModelsApi } from "./api/models";
import { createBillingApi } from "./api/billing";

// Exportamos todos los tipos para mantener la compatibilidad con el resto de la app
export * from "./api/types";
export { resolveMediaUrl } from "./api/config";

// Instancia base (core) que maneja el token y el request genérico
const baseClient = new BaseAPIClient();

// Objeto consolidado que expone todos los métodos agrupados
// manteniendo la misma estructura "api.metodo()" original.
export const api = {
  // Manejo de tokens y core
  getToken: baseClient.getToken.bind(baseClient),
  setToken: baseClient.setToken.bind(baseClient),
  request: baseClient.request.bind(baseClient),

  // Modulos inyectados
  ...createAuthApi(baseClient),
  ...createGenerationApi(baseClient),
  ...createAdminApi(baseClient),
  ...createVendorApi(baseClient),
  ...createNotificationsApi(baseClient),
  ...createModelsApi(baseClient),
  ...createBillingApi(baseClient),
};

// Exportar el mismo objeto bajo el alias "apiClient" para código heredado
export const apiClient = api;