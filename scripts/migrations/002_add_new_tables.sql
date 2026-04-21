-- Migration: Add new tables for roles, notifications, billing, model profiles
-- Run this after 001_initial_schema.sql

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(2048);
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_authorized BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_authorized_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_authorized_by_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add new columns to image_reports table
ALTER TABLE image_reports ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE image_reports ADD COLUMN IF NOT EXISTS rejection_disclaimer TEXT;
ALTER TABLE image_reports ADD COLUMN IF NOT EXISTS reviewed_by_id UUID;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create model_profiles table
CREATE TABLE IF NOT EXISTS model_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    studio_id UUID REFERENCES users(id) ON DELETE SET NULL,
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    age INTEGER,
    gender VARCHAR(20),
    ethnicity VARCHAR(100),
    hair_color VARCHAR(50),
    eye_color VARCHAR(50),
    height_cm INTEGER,
    training_photos JSONB DEFAULT '[]',
    ai_model_id VARCHAR(255),
    training_started_at TIMESTAMPTZ,
    training_completed_at TIMESTAMPTZ,
    training_cost_usd NUMERIC(10, 6),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    approved_by_id UUID,
    approved_at TIMESTAMPTZ,
    images_per_order INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_model_profiles_user_id ON model_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_model_profiles_studio_id ON model_profiles(studio_id);
CREATE INDEX IF NOT EXISTS idx_model_profiles_status ON model_profiles(status);

-- Create model_creation_requests table
CREATE TABLE IF NOT EXISTS model_creation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_email VARCHAR(320) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    model_phone VARCHAR(50),
    training_photos JSONB DEFAULT '[]',
    model_info JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    payment_required BOOLEAN DEFAULT TRUE,
    payment_amount_usd NUMERIC(10, 2),
    payment_completed BOOLEAN DEFAULT FALSE,
    payment_completed_at TIMESTAMPTZ,
    reviewed_by_id UUID,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_model_creation_requests_studio_id ON model_creation_requests(studio_id);
CREATE INDEX IF NOT EXISTS idx_model_creation_requests_status ON model_creation_requests(status);

-- Create billing_records table
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    studio_id UUID REFERENCES users(id) ON DELETE SET NULL,
    record_type VARCHAR(30) NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    media_id UUID REFERENCES media(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_records_user_id ON billing_records(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_studio_id ON billing_records(studio_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_record_type ON billing_records(record_type);
CREATE INDEX IF NOT EXISTS idx_billing_records_created_at ON billing_records(created_at);

-- Create user_balances table (cached balance for performance)
CREATE TABLE IF NOT EXISTS user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_costs_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_payments_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    total_images_generated INTEGER NOT NULL DEFAULT 0,
    total_ai_trainings INTEGER NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- Update users table to support new roles (safely update enum-like string column)
-- The role column is VARCHAR, so no enum migration needed, just update existing values if needed
UPDATE users SET role = 'MODELO' WHERE role = 'CREATOR';
UPDATE users SET role = 'ESTUDIO' WHERE role = 'VENDOR';

-- Mark existing admin@macondo.ai as approved
UPDATE users SET is_approved = TRUE WHERE email = 'admin@macondo.ai';
