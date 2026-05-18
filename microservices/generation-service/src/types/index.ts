export interface GenerationRequest {
  model_user_id: string;
  prompt: string;
  is_explicit?: boolean;
  num_images?: number;
  negative_prompt?: string;
  width?: number;
  height?: number;
}

export interface GenerationResult {
  id: string;
  storage_urls: string[];
  prompt: string;
  created_at: string;
  count: number;
}

export interface ModelProfile {
  id: string;
  user_id: string;
  studio_id: string | null;
  display_name: string;
  training_photos: string[];
  is_explicit: boolean;
  explicit_training_photos: string[];
  status: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  studio_id: string | null;
}
