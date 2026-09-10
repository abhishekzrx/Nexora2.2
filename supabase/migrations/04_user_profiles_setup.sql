-- =====================================================================
-- Migration: 04_user_profiles_setup.sql
-- Description: Creates the official production user_profiles table in Supabase.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =====================================================================

-- 1. Create the user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY, -- User UUID (matching auth.users.id)
  username TEXT NOT NULL UNIQUE,
  public_user_id TEXT NOT NULL UNIQUE, -- e.g. NEX-WAR-001
  warrior_name TEXT NOT NULL UNIQUE,   -- e.g. IRONPHOENIX
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('SUPER_ADMIN', 'FACULTY', 'MODERATOR', 'MEMBER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'ARCHIVED')),
  assigned_course_id TEXT,             -- 1 Primary Course Track for Students
  assigned_courses JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['*'] for Super Admin, [courseId] for student
  permissions JSONB NOT NULL DEFAULT '{"all_courses": false, "subject_overrides": {}, "content_overrides": {}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_public_id ON public.user_profiles (public_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_warrior_name ON public.user_profiles (warrior_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles (role);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Allow anyone with anon/authenticated key to read profiles
CREATE POLICY "Allow public read of user profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

-- Allow authenticated users and anon to insert profiles (during signup / admin user creation)
CREATE POLICY "Allow insert of user profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

-- Allow profile updates
CREATE POLICY "Allow update of user profiles"
  ON public.user_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow profile deletion (admin)
CREATE POLICY "Allow delete of user profiles"
  ON public.user_profiles FOR DELETE
  USING (true);

-- 5. Insert Primary Super Admin (Immutable Root Anchor)
INSERT INTO public.user_profiles (
  id,
  username,
  public_user_id,
  warrior_name,
  display_name,
  email,
  role,
  status,
  assigned_course_id,
  assigned_courses,
  permissions
) VALUES (
  'usr_super_admin_alpha',
  'adminalpha',
  'NEX-WAR-000',
  'APEXALPHA',
  'Super Admin',
  'adminalpha@nexora.io',
  'SUPER_ADMIN',
  'ACTIVE',
  '*',
  '["*"]'::jsonb,
  '{"all_courses": true, "subject_overrides": {}, "content_overrides": {}}'::jsonb
) ON CONFLICT (username) DO UPDATE SET
  role = 'SUPER_ADMIN',
  status = 'ACTIVE',
  assigned_courses = '["*"]'::jsonb,
  assigned_course_id = '*';
