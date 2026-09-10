-- Migration: 07_atomic_rpc.sql
-- Description: Supabase RPC functions for idempotent atomic practice submissions and 60-day history

-- Function: Atomic practice session submission
-- Handles: progress upsert, attempt insert, daily snapshot upsert, mcq_daily_snapshot upsert
CREATE OR REPLACE FUNCTION public.submit_practice_session(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id TEXT := p_payload->>'user_id';
  v_submission_id TEXT := p_payload->>'submission_id';
  v_course_id TEXT := p_payload->>'course_id';
  v_subject_id TEXT := p_payload->>'subject_id';
  v_subject_title TEXT := p_payload->>'subject_title';
  v_chapter_id TEXT := p_payload->>'chapter_id';
  v_chapter_title TEXT := p_payload->>'chapter_title';
  v_total_questions INT := COALESCE((p_payload->>'total_questions')::INT, 0);
  v_attempted_count INT := COALESCE((p_payload->>'attempted_count')::INT, 0);
  v_correct_count INT := COALESCE((p_payload->>'correct_count')::INT, 0);
  v_incorrect_count INT := COALESCE((p_payload->>'incorrect_count')::INT, 0);
  v_skipped_count INT := COALESCE((p_payload->>'skipped_count')::INT, 0);
  v_score INT := COALESCE((p_payload->>'score')::INT, 0);
  v_percentage INT := COALESCE((p_payload->>'percentage')::INT, 0);
  v_accuracy INT := COALESCE((p_payload->>'accuracy')::INT, 0);
  v_time_taken_seconds INT := COALESCE((p_payload->>'time_taken_seconds')::INT, 0);
  v_progress_updates JSONB := p_payload->'progressUpdates';
  v_now TIMESTAMPTZ := NOW();
  v_date DATE := v_now::DATE;
  v_existing_attempt TEXT;
  v_attempt_id TEXT;
  v_progress_rec JSONB;
BEGIN
  -- Idempotency: check if submission already processed
  SELECT id INTO v_existing_attempt
  FROM public.user_attempts
  WHERE id = v_submission_id AND user_id = v_user_id
  LIMIT 1;

  IF v_existing_attempt IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'attempt_id', v_existing_attempt
    );
  END IF;

  -- Generate attempt ID if not provided in submission_id
  IF v_submission_id IS NULL OR v_submission_id = '' THEN
    v_submission_id := 'att_' || v_user_id || '_' || EXTRACT(EPOCH FROM v_now)::TEXT || '_' || floor(random() * 1000000)::TEXT;
  END IF;

  v_attempt_id := v_submission_id;

  -- 1. Insert attempt record
  INSERT INTO public.user_attempts (
    id, user_id, course_id, subject_id, subject_title, chapter_id, chapter_title,
    total_questions, attempted_count, correct_count, incorrect_count, skipped_count,
    score, percentage, accuracy, time_taken_seconds, created_at
  ) VALUES (
    v_attempt_id, v_user_id, v_course_id, v_subject_id, v_subject_title,
    v_chapter_id, v_chapter_title,
    v_total_questions, v_attempted_count, v_correct_count, v_incorrect_count, v_skipped_count,
    v_score, v_percentage, v_accuracy, v_time_taken_seconds, v_now
  );

  -- 2. Process progress updates if provided
  IF v_progress_updates IS NOT NULL AND jsonb_array_length(v_progress_updates) > 0 THEN
    FOR v_progress_rec IN SELECT * FROM jsonb_array_elements(v_progress_updates)
    LOOP
      INSERT INTO public.mcq_progress AS mp (
        user_id, mcq_id, course_id, subject_id, chapter_id, status,
        attempts, total_attempts, correct_count, correct_attempts,
        incorrect_count, incorrect_attempts, latest_result,
        first_attempted_at, last_attempted_at, created_at, updated_at
      ) VALUES (
        v_user_id,
        v_progress_rec->>'mcq_id',
        COALESCE(v_progress_rec->>'course_id', v_course_id),
        COALESCE(v_progress_rec->>'subject_id', v_subject_id),
        COALESCE(v_progress_rec->>'chapter_id', v_chapter_id),
        COALESCE(v_progress_rec->>'status', 'UNSEEN'),
        COALESCE((v_progress_rec->>'total_attempts')::INT, COALESCE((v_progress_rec->>'attempts')::INT, 1)),
        COALESCE((v_progress_rec->>'total_attempts')::INT, COALESCE((v_progress_rec->>'attempts')::INT, 1)),
        COALESCE((v_progress_rec->>'correct_attempts')::INT, COALESCE((v_progress_rec->>'correct_count')::INT, 0)),
        COALESCE((v_progress_rec->>'correct_attempts')::INT, COALESCE((v_progress_rec->>'correct_count')::INT, 0)),
        COALESCE((v_progress_rec->>'incorrect_attempts')::INT, COALESCE((v_progress_rec->>'incorrect_count')::INT, 0)),
        COALESCE((v_progress_rec->>'incorrect_attempts')::INT, COALESCE((v_progress_rec->>'incorrect_count')::INT, 0)),
        COALESCE(v_progress_rec->>'latest_result', CASE WHEN v_progress_rec->>'status' = 'MASTERED' THEN 'CORRECT' ELSE 'INCORRECT' END),
        COALESCE((v_progress_rec->>'first_attempted_at')::TIMESTAMPTZ, v_now),
        COALESCE((v_progress_rec->>'last_attempted_at')::TIMESTAMPTZ, v_now),
        v_now, v_now
      )
      ON CONFLICT (user_id, mcq_id) DO UPDATE SET
        course_id = COALESCE(EXCLUDED.course_id, mp.course_id),
        subject_id = COALESCE(EXCLUDED.subject_id, mp.subject_id),
        chapter_id = COALESCE(EXCLUDED.chapter_id, mp.chapter_id),
        status = EXCLUDED.status,
        attempts = EXCLUDED.attempts,
        total_attempts = EXCLUDED.total_attempts,
        correct_count = EXCLUDED.correct_count,
        correct_attempts = EXCLUDED.correct_attempts,
        incorrect_count = EXCLUDED.incorrect_count,
        incorrect_attempts = EXCLUDED.incorrect_attempts,
        latest_result = EXCLUDED.latest_result,
        last_attempted_at = EXCLUDED.last_attempted_at,
        updated_at = v_now;
    END LOOP;
  END IF;

  -- 3. Upsert course-level daily snapshot
  INSERT INTO public.user_analytics_snapshots AS uas (
    user_id, course_id, subject_id, chapter_id, date,
    accuracy, questions_solved, correct_count, incorrect_count,
    study_activity, study_time, sessions_count, mastery, readiness,
    created_at, updated_at
  ) VALUES (
    v_user_id, v_course_id, v_subject_id, v_chapter_id, v_date,
    v_accuracy, v_attempted_count, v_correct_count, v_incorrect_count,
    1, v_time_taken_seconds, 1,
    COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'MASTERED') / NULLIF(COUNT(*), 0))
              FROM public.mcq_progress WHERE user_id = v_user_id AND course_id = v_course_id), 0),
    COALESCE((SELECT ROUND(0.5 * uas.accuracy + 0.3 * uas.mastery + 0.2 * uas.coverage)
              FROM public.user_analytics_snapshots uas WHERE user_id = v_user_id AND course_id = v_course_id AND date = v_date), 0),
    v_now, v_now
  )
  ON CONFLICT (user_id, course_id, date) DO UPDATE SET
    subject_id = COALESCE(EXCLUDED.subject_id, uas.subject_id),
    chapter_id = COALESCE(EXCLUDED.chapter_id, uas.chapter_id),
    accuracy = EXCLUDED.accuracy,
    questions_solved = uas.questions_solved + EXCLUDED.questions_solved,
    correct_count = uas.correct_count + EXCLUDED.correct_count,
    incorrect_count = uas.incorrect_count + EXCLUDED.incorrect_count,
    study_activity = uas.study_activity + 1,
    study_time = uas.study_time + EXCLUDED.study_time,
    sessions_count = uas.sessions_count + 1,
    mastery = EXCLUDED.mastery,
    readiness = EXCLUDED.readiness,
    updated_at = v_now;

  -- 4. Upsert mcq_daily_snapshot for 60-day history
  INSERT INTO public.mcq_daily_snapshots AS mds (
    user_id, course_id, subject_id, chapter_id, date,
    questions_attempted, unique_questions_attempted, correct_count, incorrect_count,
    accuracy, coverage, mastery, readiness, study_time, sessions_count,
    created_at, updated_at
  ) VALUES (
    v_user_id, v_course_id, v_subject_id, v_chapter_id, v_date,
    v_attempted_count,
    COALESCE((SELECT COUNT(DISTINCT mcq_id) FROM public.mcq_progress WHERE user_id = v_user_id AND course_id = v_course_id), 0),
    v_correct_count, v_incorrect_count,
    v_accuracy,
    COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('INCORRECT', 'MASTERED')) / NULLIF(COUNT(*), 0))
              FROM public.mcq_progress WHERE user_id = v_user_id AND course_id = v_course_id), 0),
    COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'MASTERED') / NULLIF(COUNT(*), 0))
              FROM public.mcq_progress WHERE user_id = v_user_id AND course_id = v_course_id), 0),
    COALESCE((SELECT ROUND(0.5 * accuracy + 0.3 * mastery + 0.2 * coverage)
              FROM public.mcq_daily_snapshots
              WHERE user_id = v_user_id AND course_id = v_course_id AND subject_id = v_subject_id AND chapter_id = v_chapter_id AND date = v_date), 0),
    v_time_taken_seconds, 1,
    v_now, v_now
  )
  ON CONFLICT (user_id, course_id, subject_id, chapter_id, date) DO UPDATE SET
    questions_attempted = mds.questions_attempted + EXCLUDED.questions_attempted,
    correct_count = mds.correct_count + EXCLUDED.correct_count,
    incorrect_count = mds.incorrect_count + EXCLUDED.incorrect_count,
    accuracy = EXCLUDED.accuracy,
    study_time = mds.study_time + EXCLUDED.study_time,
    sessions_count = mds.sessions_count + 1,
    coverage = EXCLUDED.coverage,
    mastery = EXCLUDED.mastery,
    readiness = EXCLUDED.readiness,
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'user_id', v_user_id
  );
END;
$$;

-- Grant execute to anon and authenticated roles (PostgREST uses these)
GRANT EXECUTE ON FUNCTION public.submit_practice_session(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_practice_session(JSONB) TO authenticated;

-- Function: Upsert MCQ daily snapshot (can be called independently)
CREATE OR REPLACE FUNCTION public.upsert_mcq_daily_snapshot(
  p_user_id TEXT,
  p_course_id TEXT,
  p_subject_id TEXT,
  p_chapter_id TEXT,
  p_date DATE,
  p_questions_attempted INT DEFAULT 0,
  p_correct_count INT DEFAULT 0,
  p_incorrect_count INT DEFAULT 0,
  p_accuracy INT DEFAULT 0,
  p_study_time INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_coverage INT;
  v_mastery INT;
  v_readiness INT;
BEGIN
  SELECT
    ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('INCORRECT', 'MASTERED')) / NULLIF(COUNT(*), 0)),
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'MASTERED') / NULLIF(COUNT(*), 0))
  INTO v_coverage, v_mastery
  FROM public.mcq_progress
  WHERE user_id = p_user_id AND course_id = p_course_id;

  v_readiness := COALESCE(
    ROUND(0.5 * p_accuracy + 0.3 * COALESCE(v_mastery, 0) + 0.2 * COALESCE(v_coverage, 0)),
    0
  );

  INSERT INTO public.mcq_daily_snapshots AS mds (
    user_id, course_id, subject_id, chapter_id, date,
    questions_attempted, unique_questions_attempted, correct_count, incorrect_count,
    accuracy, coverage, mastery, readiness, study_time, sessions_count,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_course_id, p_subject_id, p_chapter_id, p_date,
    p_questions_attempted,
    COALESCE((SELECT COUNT(DISTINCT mcq_id) FROM public.mcq_progress WHERE user_id = p_user_id AND course_id = p_course_id), 0),
    p_correct_count, p_incorrect_count,
    p_accuracy, COALESCE(v_coverage, 0), COALESCE(v_mastery, 0), v_readiness,
    p_study_time, 1, v_now, v_now
  )
  ON CONFLICT (user_id, course_id, subject_id, chapter_id, date) DO UPDATE SET
    questions_attempted = mds.questions_attempted + EXCLUDED.questions_attempted,
    correct_count = mds.correct_count + EXCLUDED.correct_count,
    incorrect_count = mds.incorrect_count + EXCLUDED.incorrect_count,
    accuracy = EXCLUDED.accuracy,
    study_time = mds.study_time + EXCLUDED.study_time,
    sessions_count = mds.sessions_count + 1,
    coverage = EXCLUDED.coverage,
    mastery = EXCLUDED.mastery,
    readiness = EXCLUDED.readiness,
    updated_at = v_now;

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'date', p_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_mcq_daily_snapshot(TEXT, TEXT, TEXT, TEXT, DATE, INT, INT, INT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_mcq_daily_snapshot(TEXT, TEXT, TEXT, TEXT, DATE, INT, INT, INT, INT, INT) TO authenticated;

-- Function: Clean up old snapshots beyond 60 days (optional, can be triggered manually)
CREATE OR REPLACE FUNCTION public.prune_old_analytics_snapshots(p_retention_days INT DEFAULT 60)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.mcq_daily_snapshots
  WHERE date < (CURRENT_DATE - (p_retention_days || ' days')::INTERVAL);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_old_analytics_snapshots(INT) TO anon;
GRANT EXECUTE ON FUNCTION public.prune_old_analytics_snapshots(INT) TO authenticated;
