-- Migration: Add explicit content fields to model_profiles and model_creation_requests
-- Description: Adds is_explicit flag and explicit_training_photos array for models with explicit content

-- Add to model_profiles table
ALTER TABLE model_profiles 
ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE model_profiles 
ADD COLUMN IF NOT EXISTS explicit_training_photos JSONB DEFAULT '[]'::jsonb;

-- Add to model_creation_requests table
ALTER TABLE model_creation_requests 
ADD COLUMN IF NOT EXISTS is_explicit BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE model_creation_requests 
ADD COLUMN IF NOT EXISTS explicit_training_photos JSONB DEFAULT '[]'::jsonb;

-- Add index for querying explicit models
CREATE INDEX IF NOT EXISTS idx_model_profiles_is_explicit ON model_profiles(is_explicit);
CREATE INDEX IF NOT EXISTS idx_model_creation_requests_is_explicit ON model_creation_requests(is_explicit);

-- Comments for documentation
COMMENT ON COLUMN model_profiles.is_explicit IS 'Flag indicating if model has explicit content enabled';
COMMENT ON COLUMN model_profiles.explicit_training_photos IS 'Array of URLs for 8 explicit training photos';
COMMENT ON COLUMN model_creation_requests.is_explicit IS 'Flag indicating if model request includes explicit content';
COMMENT ON COLUMN model_creation_requests.explicit_training_photos IS 'Array of URLs for 8 explicit training photos';
