-- Migration: 01_mcq_progress.sql
-- Description: Create mcq_progress table for persistent per-user MCQ retirement and mastery tracking.

CREATE TABLE IF NOT EXISTS public.mcq_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  mcq_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNSEEN', -- UNSEEN | INCORRECT | MASTERED
  attempts INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mcq_progress_user_mcq_key UNIQUE (user_id, mcq_id)
);

-- Indexes for efficient querying by user and chapter / status
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_chapter ON public.mcq_progress (user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_status ON public.mcq_progress (user_id, status);

-- Enable RLS
ALTER TABLE public.mcq_progress ENABLE ROW LEVEL SECURITY;

-- Permissive policies for PostgREST client operations
CREATE POLICY "Allow select mcq_progress" ON public.mcq_progress FOR SELECT USING (true);
CREATE POLICY "Allow insert mcq_progress" ON public.mcq_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update mcq_progress" ON public.mcq_progress FOR UPDATE USING (true);
