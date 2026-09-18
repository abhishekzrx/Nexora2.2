-- ============================================================================
-- 10_practice_session_integrity.sql
-- Phase 1: MCQ Practice Session Integrity, Question Freezing & Resilient State
-- ============================================================================

-- 1. Create or alter public.practice_sessions table
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  submission_id TEXT UNIQUE,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  subject_title TEXT,
  chapter_id TEXT,
  chapter_title TEXT,
  topic_id TEXT,
  concept_id TEXT,
  mode TEXT NOT NULL DEFAULT 'set_20',
  session_size INT NOT NULL DEFAULT 20,
  requested_count INT NOT NULL DEFAULT 20,
  actual_count INT NOT NULL DEFAULT 20,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'PAUSED' | 'SUBMITTED' | 'ABANDONED'
  current_question_index INT NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  marked_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  visited_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  option_orders JSONB NOT NULL DEFAULT '{}'::jsonb,
  correct_count INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  percentage INT NOT NULL DEFAULT 0,
  accuracy INT NOT NULL DEFAULT 0,
  time_taken_seconds INT NOT NULL DEFAULT 0,
  seconds_left INT NOT NULL DEFAULT 0,
  total_allocated_seconds INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was previously created by migration 06
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS question_order JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS session_size INT NOT NULL DEFAULT 20;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS current_question_index INT NOT NULL DEFAULT 0;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS marked_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS visited_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS option_orders JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS seconds_left INT NOT NULL DEFAULT 0;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS total_allocated_seconds INT NOT NULL DEFAULT 0;
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Indexes for fast session recovery and status checks
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_status ON public.practice_sessions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_chapter_status ON public.practice_sessions (user_id, chapter_id, status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_session_id ON public.practice_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_updated_at ON public.practice_sessions (updated_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow user select practice_sessions" ON public.practice_sessions;
CREATE POLICY "Allow user select practice_sessions" ON public.practice_sessions
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Allow user insert practice_sessions" ON public.practice_sessions;
CREATE POLICY "Allow user insert practice_sessions" ON public.practice_sessions
  FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow user update practice_sessions" ON public.practice_sessions;
CREATE POLICY "Allow user update practice_sessions" ON public.practice_sessions
  FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- 4. RPC for atomic session upsert / answer save
CREATE OR REPLACE FUNCTION public.save_practice_session_state(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id TEXT;
  v_user_id TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_session_id := p_payload->>'session_id';
  v_user_id := p_payload->>'user_id';

  IF v_session_id IS NULL OR v_session_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_id is required');
  END IF;

  INSERT INTO public.practice_sessions (
    session_id, user_id, course_id, subject_id, subject_title,
    chapter_id, chapter_title, topic_id, concept_id, mode,
    session_size, requested_count, actual_count, question_ids, question_order,
    status, current_question_index, answers, marked_question_ids, visited_question_ids,
    option_orders, seconds_left, total_allocated_seconds, created_at, updated_at
  ) VALUES (
    v_session_id,
    v_user_id,
    COALESCE(p_payload->>'course_id', 'default_course'),
    p_payload->>'subject_id',
    p_payload->>'subject_title',
    p_payload->>'chapter_id',
    p_payload->>'chapter_title',
    p_payload->>'topic_id',
    p_payload->>'concept_id',
    COALESCE(p_payload->>'mode', 'adaptive'),
    COALESCE((p_payload->>'session_size')::INT, 20),
    COALESCE((p_payload->>'requested_count')::INT, 20),
    COALESCE((p_payload->>'actual_count')::INT, 20),
    COALESCE(p_payload->'question_ids', '[]'::jsonb),
    COALESCE(p_payload->'question_order', '[]'::jsonb),
    COALESCE(p_payload->>'status', 'ACTIVE'),
    COALESCE((p_payload->>'current_question_index')::INT, 0),
    COALESCE(p_payload->'answers', '{}'::jsonb),
    COALESCE(p_payload->'marked_question_ids', '[]'::jsonb),
    COALESCE(p_payload->'visited_question_ids', '[]'::jsonb),
    COALESCE(p_payload->'option_orders', '{}'::jsonb),
    COALESCE((p_payload->>'seconds_left')::INT, 0),
    COALESCE((p_payload->>'total_allocated_seconds')::INT, 0),
    v_now,
    v_now
  )
  ON CONFLICT (session_id) DO UPDATE SET
    course_id = COALESCE(EXCLUDED.course_id, practice_sessions.course_id),
    status = COALESCE(EXCLUDED.status, practice_sessions.status),
    current_question_index = COALESCE(EXCLUDED.current_question_index, practice_sessions.current_question_index),
    answers = COALESCE(EXCLUDED.answers, practice_sessions.answers),
    marked_question_ids = COALESCE(EXCLUDED.marked_question_ids, practice_sessions.marked_question_ids),
    visited_question_ids = COALESCE(EXCLUDED.visited_question_ids, practice_sessions.visited_question_ids),
    seconds_left = COALESCE(EXCLUDED.seconds_left, practice_sessions.seconds_left),
    updated_at = v_now;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_practice_session_state(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.save_practice_session_state(JSONB) TO authenticated;
