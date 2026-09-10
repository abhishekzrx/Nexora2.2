-- Migration: 06_rls_policies.sql
-- Description: User-scoped RLS for cross-device data isolation

-- Enable RLS on all relevant tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public select user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public insert user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public update user_profiles" ON public.user_profiles;

DROP POLICY IF EXISTS "Allow select mcq_progress_v2" ON public.mcq_progress;
DROP POLICY IF EXISTS "Allow insert mcq_progress_v2" ON public.mcq_progress;
DROP POLICY IF EXISTS "Allow update mcq_progress_v2" ON public.mcq_progress;

DROP POLICY IF EXISTS "Allow select mcq_progress" ON public.mcq_progress;
DROP POLICY IF EXISTS "Allow insert mcq_progress" ON public.mcq_progress;
DROP POLICY IF EXISTS "Allow update mcq_progress" ON public.mcq_progress;

DROP POLICY IF EXISTS "Allow select user_attempts" ON public.user_attempts;
DROP POLICY IF EXISTS "Allow insert user_attempts" ON public.user_attempts;

DROP POLICY IF EXISTS "Allow select user_analytics_snapshots" ON public.user_analytics_snapshots;
DROP POLICY IF EXISTS "Allow insert user_analytics_snapshots" ON public.user_analytics_snapshots;
DROP POLICY IF EXISTS "Allow update user_analytics_snapshots" ON public.user_analytics_snapshots;

DROP POLICY IF EXISTS "Allow select admin_audit_logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Allow insert admin_audit_logs" ON public.admin_audit_logs;

DROP POLICY IF EXISTS "Allow select identity_audit_logs" ON public.identity_audit_logs;
DROP POLICY IF EXISTS "Allow insert identity_audit_logs" ON public.identity_audit_logs;

DROP POLICY IF EXISTS "Allow select notes" ON public.notes;
DROP POLICY IF EXISTS "Allow insert notes" ON public.notes;
DROP POLICY IF EXISTS "Allow update notes" ON public.notes;
DROP POLICY IF EXISTS "Allow delete notes" ON public.notes;

-- Helper function: get current authenticated user ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claims', true)::json->>'user_id',
    ''
  )
$$;

-- Helper function: check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = public.get_current_user_id()) = 'SUPER_ADMIN',
    false
  )
$$;

-- USER PROFILES
-- Anon can read profiles for directory lookup (login/signup)
CREATE POLICY "Allow anon read user_profiles" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'anon');

-- Authenticated users can read their own profile
CREATE POLICY "Users can select own profile" ON public.user_profiles
  FOR SELECT USING (id = public.get_current_user_id());

-- Super admins can read all profiles
CREATE POLICY "Super admins can select all profiles" ON public.user_profiles
  FOR SELECT USING (
    auth.role() = 'authenticated' AND public.is_current_user_super_admin()
  );

-- Users can insert their own profile (for signup with valid JWT)
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (id = public.get_current_user_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (id = public.get_current_user_id());

-- Super admins can update any profile
CREATE POLICY "Super admins can update all profiles" ON public.user_profiles
  FOR UPDATE USING (public.is_current_user_super_admin());

-- MCQ PROGRESS
-- Users can read their own progress
CREATE POLICY "Users can select own mcq progress" ON public.mcq_progress
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Super admins can read all progress
CREATE POLICY "Super admins can select all mcq progress" ON public.mcq_progress
  FOR SELECT USING (public.is_current_user_super_admin());

-- Users can insert their own progress
CREATE POLICY "Users can insert own mcq progress" ON public.mcq_progress
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- Users can update their own progress
CREATE POLICY "Users can update own mcq progress" ON public.mcq_progress
  FOR UPDATE USING (user_id = public.get_current_user_id());

-- Super admins can update any progress
CREATE POLICY "Super admins can update all mcq progress" ON public.mcq_progress
  FOR UPDATE USING (public.is_current_user_super_admin());

-- USER ATTEMPTS
-- Users can read their own attempts
CREATE POLICY "Users can select own attempts" ON public.user_attempts
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Super admins can read all attempts
CREATE POLICY "Super admins can select all attempts" ON public.user_attempts
  FOR SELECT USING (public.is_current_user_super_admin());

-- Users can insert their own attempts
CREATE POLICY "Users can insert own attempts" ON public.user_attempts
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- USER ANALYTICS SNAPSHOTS
-- Users can read their own snapshots
CREATE POLICY "Users can select own analytics snapshots" ON public.user_analytics_snapshots
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Super admins can read all snapshots
CREATE POLICY "Super admins can select all analytics snapshots" ON public.user_analytics_snapshots
  FOR SELECT USING (public.is_current_user_super_admin());

-- Users can insert their own snapshots
CREATE POLICY "Users can insert own analytics snapshots" ON public.user_analytics_snapshots
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- Users can update their own snapshots
CREATE POLICY "Users can update own analytics snapshots" ON public.user_analytics_snapshots
  FOR UPDATE USING (user_id = public.get_current_user_id());

-- MCQ DAILY SNAPSHOTS
-- Users can read their own daily snapshots
CREATE POLICY "Users can select own mcq daily snapshots" ON public.mcq_daily_snapshots
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Super admins can read all daily snapshots
CREATE POLICY "Super admins can select all mcq daily snapshots" ON public.mcq_daily_snapshots
  FOR SELECT USING (public.is_current_user_super_admin());

-- Users can insert their own daily snapshots
CREATE POLICY "Users can insert own mcq daily snapshots" ON public.mcq_daily_snapshots
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

-- Users can update their own daily snapshots
CREATE POLICY "Users can update own mcq daily snapshots" ON public.mcq_daily_snapshots
  FOR UPDATE USING (user_id = public.get_current_user_id());

-- ADMIN AUDIT LOGS
-- Super admins can read all audit logs
CREATE POLICY "Super admins can select admin audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_current_user_super_admin());

-- Users can insert their own audit logs
CREATE POLICY "Users can insert admin audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (admin_user_id = public.get_current_user_id());

-- IDENTITY AUDIT LOGS
-- Super admins can read all identity audit logs
CREATE POLICY "Super admins can select identity audit logs" ON public.identity_audit_logs
  FOR SELECT USING (public.is_current_user_super_admin());

-- Users can insert their own identity audit logs
CREATE POLICY "Users can insert identity audit logs" ON public.identity_audit_logs
  FOR INSERT WITH CHECK (internal_user_id = public.get_current_user_id());

-- NOTES
-- Users can read notes for their assigned courses
CREATE POLICY "Users can select notes" ON public.notes
  FOR SELECT USING (
    course_id IN (
      SELECT assigned_courses::text
      FROM public.user_profiles
      WHERE id = public.get_current_user_id()
    )
    OR public.is_current_user_super_admin()
  );

-- Super admins can manage notes
CREATE POLICY "Super admins can insert notes" ON public.notes
  FOR INSERT WITH CHECK (public.is_current_user_super_admin());

CREATE POLICY "Super admins can update notes" ON public.notes
  FOR UPDATE USING (public.is_current_user_super_admin());

CREATE POLICY "Super admins can delete notes" ON public.notes
  FOR DELETE USING (public.is_current_user_super_admin());
