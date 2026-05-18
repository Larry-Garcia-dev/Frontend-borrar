export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  vendor_id?: string;
  quota_reset_at?: string;
}

export interface GenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  media_type?: string;
  reference_image_url?: string;
  reference_image_urls?: string[];
  num_images?: number;
  model?: string;
  template_id?: string;
  parent_media_id?: string;
}

export interface ExplicitGenerationRequest {
  background_b64: string;  // Base64 de la imagen de fondo (piscina, cocina, etc.)
  pose_b64: string;  // Base64 de la imagen de pose
  reference_url: string;  // URL de la foto de referencia principal de la modelo
  reference_urls?: string[];  // URLs de múltiples fotos de referencia (4 aleatorias)
  additional_prompt?: string;  // Instrucciones adicionales opcionales
  width?: number;
  height?: number;
  num_images?: number;  // Cantidad de imágenes a generar (1-10)
}

export interface GenerationTaskResponse {
  task_id: string;
  status: string;
  detail: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string;
  detail: string;
}

export interface GeneratedMedia {
  id: string;
  media_type: string;
  prompt: string;
  storage_url: string;
  status: string;
  created_at: string;
  edit_count: number;
  parent_media_id?: string;
  is_approved: boolean;
}

export interface GeneratedImage extends GeneratedMedia { }

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GoogleCallbackResponse {
  access_token: string;
  email?: string;
  user_id?: string;
  avatar_url?: string;
  picture?: string;
  role?: string;
  daily_limit?: number;
  used_quota?: number;
  is_unlimited?: boolean;
  quota_reset_at?: string;
}

export interface MeResponse {
  email: string;
  user_id: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  role: string;
  quota_reset_at?: string;
}

export interface QuotaUpdate {
  user_id: string;
  quota: number;
}

export interface VendorStats {
  total_users: number;
  active_users: number;
  total_generations: number;
  quota_used: number;
  quota_total: number;
}

export interface AdminStats {
  total_users: number;
  total_media: number;
  admin_count: number;
  total_cost_usd: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  vendor_id?: string;
}

export interface VendorUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  quota_reset_at?: string;
}

// NUEVA ESTRUCTURA: Prompt template para Admin
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_by: string;
}

export interface ImageReport {
  id: string;
  media_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_note?: string;
  created_at: string;
  reviewed_at?: string;
  storage_url?: string;
}

export interface UserCost {
  user_id: string;
  email: string;
  total_cost_usd: number;
  media_count: number;
}

export interface UserMedia {
  id: string;
  media_type: string;
  prompt: string;
  storage_url: string;
  created_at: string;
  cost_usd?: number;
  model_used?: string;
}

export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface ModelProfile {
  id: string;
  user_id: string;
  studio_id?: string;
  display_name: string;
  bio?: string;
  age?: number;
  gender?: string;
  ethnicity?: string;
  hair_color?: string;
  eye_color?: string;
  height_cm?: number;
  training_photos: string[];
  is_explicit: boolean;
  explicit_training_photos: string[];
  ai_model_id?: string;
  status: string;
  rejection_reason?: string;
  images_per_order: number;
  created_at: string;
}

export interface ModelCreationRequest {
  id: string;
  studio_id: string;
  model_email: string;
  model_name: string;
  model_phone?: string;
  training_photos: string[];
  is_explicit: boolean;
  explicit_training_photos: string[];
  model_info?: Record<string, unknown>;
  status: string;
  payment_required: boolean;
  payment_amount_usd?: number;
  payment_completed: boolean;
  rejection_reason?: string;
  created_at: string;
}

export interface CreateModelRequestData {
  model_email: string;
  model_name: string;
  model_phone?: string;
  model_info?: Record<string, unknown>;
  training_photos: string[];
  is_explicit?: boolean;
  explicit_training_photos?: string[];
}

export interface BillingRecord {
  id: string;
  record_type: string;
  description: string;
  amount_usd: number;
  media_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface UserBalance {
  user_id: string;
  balance_usd: number;
  total_costs_usd: number;
  total_payments_usd: number;
  total_images_generated: number;
  total_ai_trainings: number;
  last_updated_at: string;
}

export interface BillingSummary {
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  balance: UserBalance;
  recent_records: BillingRecord[];
  period_costs: number;
  period_payments: number;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  created_by: string;
}
