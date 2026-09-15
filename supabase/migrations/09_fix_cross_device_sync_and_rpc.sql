-- Migration: 09_fix_cross_device_sync_and_rpc.sql
-- Description: Robust PostgreSQL RPC and single source of truth enhancements for cross-device MCQ progress & analytics sync.

-- 1. Performance and User Scoping Indexes
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_updated ON public.mcq_progress (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_course ON public.mcq_progress (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_mcq_progress_user_chapter ON public.mcq_progress (user_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_user_course_date ON public.user_attempts (user_id, course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_snapshots_user_course_date ON public.user_analytics_snapshots (user_id, course_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mcq_daily_snapshots_user_course_date ON public.mcq_daily_snapshots (user_id, course_id, date DESC);

-- 2. Enhanced submit_practice_session RPC supporting both camelCase and snake_case parameters
CREATE OR REPLACE FUNCTION public.submit_practice_session(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id TEXT := COALESCE(p_payload->>'user_id', p_payload->>'userId');
  v_submission_id TEXT := COALESCE(p_payload->>'submission_id', p_payload->>'submissionId');
  v_course_id TEXT := COALESCE(p_payload->>'course_id', p_payload->>'courseId');
  v_subject_id TEXT := COALESCE(p_payload->>'subject_id', p_payload->>'subjectId');
  v_subject_title TEXT := COALESCE(p_payload->>'subject_title', p_payload->>'subjectTitle');
  v_chapter_id TEXT := COALESCE(p_payload->>'chapter_id', p_payload->>'chapterId');
  v_chapter_title TEXT := COALESCE(p_payload->>'chapter_title', p_payload->>'chapterTitle');
  v_topic_id TEXT := COALESCE(p_payload->>'topic_id', p_payload->>'topicId');
  v_concept_id TEXT := COALESCE(p_payload->>'concept_id', p_payload->>'conceptId');
  v_mode TEXT := COALESCE(p_payload->>'mode', 'set_20');
  v_total_questions INT := COALESCE((COALESCE(p_payload->>'total_questions', p_payload->>'totalQuestions'))::INT, 0);
  v_attempted_count INT := COALESCE((COALESCE(p_payload->>'attempted_count', p_payload->>'attemptedCount'))::INT, 0);
  v_correct_count INT := COALESCE((COALESCE(p_payload->>'correct_count', p_payload->>'correctCount'))::INT, 0);
  v_incorrect_count INT := COALESCE((COALESCE(p_payload->>'incorrect_count', p_payload->>'incorrectCount'))::INT, 0);
  v_skipped_count INT := COALESCE((COALESCE(p_payload->>'skipped_count', p_payload->>'skippedCount'))::INT, 0);
  v_score INT := COALESCE((p_payload->>'score')::INT, 0);
  v_percentage INT := COALESCE((p_payload->>'percentage')::INT, 0);
  v_accuracy INT := COALESCE((p_payload->>'accuracy')::INT, 0);
  v_time_taken_seconds INT := COALESCE((COALESCE(p_payload->>'time_taken_seconds', p_payload->>'timeTakenSeconds'))::INT, 0);
  
  -- Support BOTH snake_case and camelCase arrays
  v_progress_updates JSONB := COALESCE(p_payload->'progress_updates', p_payload->'progressUpdates');
  v_attempt_logs JSONB := COALESCE(p_payload->'attempt_logs', p_payload->'attemptLogs');
  
  v_now TIMESTAMPTZ := NOW();
  v_date DATE := v_now::DATE;
  v_existing_attempt TEXT;
  v_attempt_id TEXT;
  v_progress_rec JSONB;
  v_mcq_id TEXT;
BEGIN
  IF v_user_id IS NULL OR v_user_id = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_id is required'
    );
  END IF;

  -- 1. Idempotency Check: prevent duplicate insertions for same submission_id
  IF v_submission_id IS NOT NULL AND v_submission_id != '' THEN
    SELECT id INTO v_existing_attempt
    FROM public.user_attempts
    WHERE id = v_submission_id AND user_id = v_user_id
    LIMIT 1;

    IF v_existing_attempt IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'attempt_id', v_existing_attempt,
        'user_id', v_user_id
      );
    END IF;
  ELSE
    v_submission_id := 'att_' || v_user_id || '_' || EXTRACT(EPOCH FROM v_now)::TEXT || '_' || floor(random() * 1000000)::TEXT;
  END IF;

  v_attempt_id := v_submission_id;

  -- 2. Insert Attempt Record into public.user_attempts
  INSERT INTO public.user_attempts (
    id, user_id, course_id, subject_id, subject_title, chapter_id, chapter_title,
    topic_id, concept_id, mode,
    total_questions, attempted_count, correct_count, incorrect_count, skipped_count,
    score, percentage, accuracy, time_taken_seconds, created_at
  ) VALUES (
    v_attempt_id, v_user_id, v_course_id, v_subject_id, v_subject_title,
    v_chapter_id, v_chapter_title,
    v_topic_id, v_concept_id, v_mode,
    v_total_questions, v_attempted_count, v_correct_count, v_incorrect_count, v_skipped_count,
    v_score, v_percentage, v_accuracy, v_time_taken_seconds, v_now
  );

  -- 3. Upsert Unique Question Progress into public.mcq_progress
  IF v_progress_updates IS NOT NULL AND jsonb_typeof(v_progress_updates) = 'array' AND jsonb_array_length(v_progress_updates) > 0 THEN
    FOR v_progress_rec IN SELECT * FROM jsonb_array_elements(v_progress_updates)
    LOOP
      v_mcq_id := COALESCE(v_progress_rec->>'mcq_id', v_progress_rec->>'mcqId');
      
      IF v_mcq_id IS NOT NULL AND v_mcq_id != '' THEN
        INSERT INTO public.mcq_progress AS mp (
          user_id, mcq_id, course_id, subject_id, chapter_id, status,
          attempts, total_attempts, correct_count, correct_attempts,
          incorrect_count, incorrect_attempts, latest_result,
          first_attempted_at, last_attempted_at, created_at, updated_at
        ) VALUES (
          v_user_id,
          v_mcq_id,
          COALESCE(v_progress_rec->>'course_id', v_progress_rec->>'courseId', v_course_id),
          COALESCE(v_progress_rec->>'subject_id', v_progress_rec->>'subjectId', v_subject_id),
          COALESCE(v_progress_rec->>'chapter_id', v_progress_rec->>'chapterId', v_chapter_id),
          COALESCE(v_progress_rec->>'status', 'UNSEEN'),
          COALESCE((COALESCE(v_progress_rec->>'total_attempts', v_progress_rec->>'attempts'))::INT, 1),
          COALESCE((COALESCE(v_progress_rec->>'total_attempts', v_progress_rec->>'attempts'))::INT, 1),
          COALESCE((COALESCE(v_progress_rec->>'correct_attempts', v_progress_rec->>'correct_count'))::INT, 0),
          COALESCE((COALESCE(v_progress_rec->>'correct_attempts', v_progress_rec->>'correct_count'))::INT, 0),
          COALESCE((COALESCE(v_progress_rec->>'incorrect_attempts', v_progress_rec->>'incorrect_count'))::INT, 0),
          COALESCE((COALESCE(v_progress_rec->>'incorrect_attempts', v_progress_rec->>'incorrect_count'))::INT, 0),
          COALESCE(v_progress_rec->>'latest_result', CASE WHEN v_progress_rec->>'status' = 'MASTERED' THEN 'CORRECT' ELSE 'INCORRECT' END),
          COALESCE((COALESCE(v_progress_rec->>'first_attempted_at', v_progress_rec->>'last_attempted_at'))::TIMESTAMPTZ, v_now),
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
      END IF;
    END LOOP;
  END IF;

  -- 4. Upsert Course-Level Daily Snapshot in public.user_analytics_snapshots
  IF v_course_id IS NOT NULL AND v_course_id != '' THEN
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

    -- 5. Upsert Detailed mcq_daily_snapshots for 60-day history
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
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'user_id', v_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_practice_session(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_practice_session(JSONB) TO authenticated;
