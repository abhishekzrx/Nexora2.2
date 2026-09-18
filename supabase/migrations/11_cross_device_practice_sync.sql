-- ============================================================================
-- 11_cross_device_practice_sync.sql
-- Phase 2: Complete Cross-Device Practice Session & Learning Data Synchronization
-- ============================================================================

-- 1. Ensure composite indexes for high-frequency cross-device queries
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_status_updated 
  ON public.practice_sessions (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_lookup_active 
  ON public.practice_sessions (user_id, chapter_id, status) 
  WHERE status IN ('ACTIVE', 'PAUSED');

CREATE INDEX IF NOT EXISTS idx_practice_sessions_session_user 
  ON public.practice_sessions (session_id, user_id);

-- 2. Atomic Question-Level Answer Recording RPC
-- Updates strictly ONE question_id key in the answers JSONB object.
-- Guarantees that Device A answering Q1 never overwrites Device B answering Q2.
CREATE OR REPLACE FUNCTION public.record_practice_session_answer(
  p_session_id TEXT,
  p_user_id TEXT,
  p_question_id TEXT,
  p_answer JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_at TIMESTAMPTZ := NOW();
  v_rows_affected INT;
  v_current_answers JSONB;
BEGIN
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_id is required');
  END IF;

  IF p_question_id IS NULL OR p_question_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'question_id is required');
  END IF;

  -- Atomic update targeting only this specific question key
  UPDATE public.practice_sessions
  SET 
    answers = jsonb_set(COALESCE(answers, '{}'::jsonb), ARRAY[p_question_id], p_answer, true),
    updated_at = v_updated_at
  WHERE session_id = p_session_id
    AND user_id = p_user_id
    AND status IN ('ACTIVE', 'PAUSED');

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    -- Check if session already submitted or abandoned
    SELECT answers INTO v_current_answers
    FROM public.practice_sessions
    WHERE session_id = p_session_id;

    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Session is not active or unauthorized',
      'session_id', p_session_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'session_id', p_session_id, 
    'question_id', p_question_id,
    'updated_at', v_updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_practice_session_answer(TEXT, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.record_practice_session_answer(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 3. Enhanced Upsert RPC with JSONB Shallow Merge
-- Guarantees that bulk state updates (timer, navigation) merge answers instead of wiping keys.
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
    -- JSONB SHALLOW MERGE: Retain all existing answers, add/overwrite only incoming ones
    answers = COALESCE(practice_sessions.answers, '{}'::jsonb) || COALESCE(EXCLUDED.answers, '{}'::jsonb),
    marked_question_ids = COALESCE(EXCLUDED.marked_question_ids, practice_sessions.marked_question_ids),
    visited_question_ids = COALESCE(EXCLUDED.visited_question_ids, practice_sessions.visited_question_ids),
    seconds_left = COALESCE(EXCLUDED.seconds_left, practice_sessions.seconds_left),
    updated_at = v_now;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'updated_at', v_now);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_practice_session_state(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.save_practice_session_state(JSONB) TO authenticated;
