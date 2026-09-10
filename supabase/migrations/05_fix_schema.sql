-- Migration: 05_fix_schema.sql
-- Description: Add missing columns from migration 03 and create mcq_daily_snapshots for 60-day history

-- Fix mcq_progress: add columns that migration 03 intended but couldn't add due to IF NOT EXISTS
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS subject_title TEXT;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS chapter_title TEXT;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS total_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS correct_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS incorrect_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS latest_result TEXT DEFAULT 'CORRECT';
ALTER TABLE public.mcq_progress ADD COLUMN IF NOT EXISTS first_attempted_at TIMESTAMPTZ DEFAULT NOW();

-- Fix user_analytics_snapshots: add columns that may be missing
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS chapter_id TEXT;
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS incorrect_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS study_time INT NOT NULL DEFAULT 0;
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS sessions_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS mastery INT NOT NULL DEFAULT 0;
ALTER TABLE public.user_analytics_snapshots ADD COLUMN IF NOT EXISTS readiness INT NOT NULL DEFAULT 0;

-- 60-day detailed daily snapshots per user per course per subject per chapter
CREATE TABLE IF NOT EXISTS public.mcq_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  chapter_id TEXT,
  date DATE NOT NULL,
  questions_attempted INT NOT NULL DEFAULT 0,
  unique_questions_attempted INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  accuracy INT NOT NULL DEFAULT 0,
  coverage INT NOT NULL DEFAULT 0,
  mastery INT NOT NULL DEFAULT 0,
  readiness INT NOT NULL DEFAULT 0,
  study_time INT NOT NULL DEFAULT 0,
  sessions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_mcq_daily_snapshots UNIQUE (user_id, course_id, subject_id, chapter_id, date)
);

CREATE INDEX IF NOT EXISTS idx_mcq_daily_snapshots_user_course_date ON public.mcq_daily_snapshots (user_id, course_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_daily_snapshots_user_subject ON public.mcq_daily_snapshots (user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_mcq_daily_snapshots_user_chapter ON public.mcq_daily_snapshots (user_id, chapter_id);

-- Index for mcq_progress to support updated_at ordering
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_updated ON public.mcq_progress (user_id, updated_at DESC);

-- Index for user_analytics_snapshots to support 60-day queries
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_course_date_desc ON public.user_analytics_snapshots (user_id, course_id, date DESC);
