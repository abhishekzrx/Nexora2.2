-- Migration: 03_production_integrity.sql
-- Description: Production Data Integrity, Security, Member Lifecycle & Admin Audit Log Schema

-- 1. USER PROFILES TABLE (Immutable UUID anchor + Unique Warrior Identities)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY, -- Immutable internal UUID anchor (e.g. auth.users.id)
  username TEXT NOT NULL UNIQUE,
  public_user_id TEXT NOT NULL UNIQUE, -- e.g. NEX-WAR-001
  warrior_name TEXT NOT NULL UNIQUE,   -- e.g. IRONPHOENIX
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MEMBER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'ARCHIVED')),
  assigned_courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions JSONB NOT NULL DEFAULT '{"all_courses": false, "subject_overrides": {}, "content_overrides": {}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles (username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_public_id ON public.user_profiles (public_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_warrior_name ON public.user_profiles (warrior_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON public.user_profiles (status);

-- 2. MCQ PROGRESS TABLE (Unique question progress per user)
CREATE TABLE IF NOT EXISTS public.mcq_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mcq_id TEXT NOT NULL,
  course_id TEXT,
  subject_id TEXT,
  chapter_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNSEEN' CHECK (status IN ('UNSEEN', 'INCORRECT', 'MASTERED')),
  attempts INT NOT NULL DEFAULT 0,
  total_attempts INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  correct_attempts INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  incorrect_attempts INT NOT NULL DEFAULT 0,
  latest_result TEXT DEFAULT 'CORRECT',
  first_attempted_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mcq_progress_user_mcq_key UNIQUE (user_id, mcq_id)
);

CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_chapter ON public.mcq_progress (user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_status ON public.mcq_progress (user_id, status);

-- 3. USER ATTEMPTS TABLE (Historical practice test logs)
CREATE TABLE IF NOT EXISTS public.user_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  subject_title TEXT,
  chapter_id TEXT,
  chapter_title TEXT,
  total_questions INT NOT NULL DEFAULT 0,
  attempted_count INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  percentage INT NOT NULL DEFAULT 0,
  accuracy INT NOT NULL DEFAULT 0,
  time_taken_seconds INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_attempts_user_course ON public.user_attempts (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_created_at ON public.user_attempts (created_at DESC);

-- 4. USER ANALYTICS SNAPSHOTS TABLE (Daily performance aggregation)
CREATE TABLE IF NOT EXISTS public.user_analytics_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  chapter_id TEXT,
  date DATE NOT NULL,
  accuracy INT NOT NULL DEFAULT 0,
  questions_solved INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  study_activity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_analytics_snapshots UNIQUE (user_id, course_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_course_date ON public.user_analytics_snapshots (user_id, course_id, date DESC);

-- 5. ADMIN AUDIT LOGS TABLE (Comprehensive administrative trail)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id TEXT,
  target_resource TEXT DEFAULT 'MEMBER_PROFILE',
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs (target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);

-- 6. IDENTITY AUDIT LOGS TABLE (Warrior identity change history)
CREATE TABLE IF NOT EXISTS public.identity_audit_logs (
  id TEXT PRIMARY KEY,
  internal_user_id TEXT NOT NULL,
  old_public_id TEXT,
  new_public_id TEXT,
  old_warrior_name TEXT,
  new_warrior_name TEXT,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_audit_logs_user ON public.identity_audit_logs (internal_user_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select user_profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update user_profiles" ON public.user_profiles FOR UPDATE USING (true);

CREATE POLICY "Allow select mcq_progress_v2" ON public.mcq_progress FOR SELECT USING (true);
CREATE POLICY "Allow insert mcq_progress_v2" ON public.mcq_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update mcq_progress_v2" ON public.mcq_progress FOR UPDATE USING (true);

CREATE POLICY "Allow select user_attempts" ON public.user_attempts FOR SELECT USING (true);
CREATE POLICY "Allow insert user_attempts" ON public.user_attempts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select user_analytics_snapshots" ON public.user_analytics_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow insert user_analytics_snapshots" ON public.user_analytics_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update user_analytics_snapshots" ON public.user_analytics_snapshots FOR UPDATE USING (true);

CREATE POLICY "Allow select admin_audit_logs" ON public.admin_audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert admin_audit_logs" ON public.admin_audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select identity_audit_logs" ON public.identity_audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert identity_audit_logs" ON public.identity_audit_logs FOR INSERT WITH CHECK (true);
