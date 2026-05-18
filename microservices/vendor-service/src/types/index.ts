// DTOs y tipos para el vendor-service

export interface VendorUserResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  quota_reset_at: string | null;
}

export interface CreateVendorUserDTO {
  email: string;
  name?: string;
  daily_limit?: number;
}

export interface UpdateVendorUserDTO {
  daily_limit: number;
}

export interface ModelCreationRequestDTO {
  model_email: string;
  model_name: string;
  model_phone?: string;
  training_photos: string[];
  is_explicit?: boolean;
  explicit_training_photos?: string[];
  model_info?: ModelInfoDTO;
}

export interface ModelInfoDTO {
  age?: number;
  gender?: string;
  ethnicity?: string;
  hair_color?: string;
  eye_color?: string;
  height_cm?: number;
  assigned_daily_limit?: number;
}

export interface ModelCreationRequestResponse {
  id: string;
  studio_id: string;
  model_email: string;
  model_name: string;
  model_phone: string | null;
  training_photos: string[];
  is_explicit: boolean;
  explicit_training_photos: string[];
  model_info: ModelInfoDTO | null;
  status: string;
  payment_required: boolean;
  payment_amount_usd: number | null;
  payment_completed: boolean;
  rejection_reason: string | null;
  created_at: string;
}

export interface ModelProfileResponse {
  id: string;
  user_id: string;
  studio_id: string | null;
  display_name: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  ethnicity: string | null;
  hair_color: string | null;
  eye_color: string | null;
  height_cm: number | null;
  training_photos: string[];
  is_explicit: boolean;
  explicit_training_photos: string[];
  ai_model_id: string | null;
  status: string;
  rejection_reason: string | null;
  images_per_order: number;
  created_at: string;
}

export interface GenerateForModelDTO {
  model_user_id: string;
  prompt: string;
  is_explicit?: boolean;
}

export interface UploadPhotosResponse {
  urls: string[];
}

export interface CreditValidation {
  isValid: boolean;
  available: number;
  requested: number;
  message?: string;
}
