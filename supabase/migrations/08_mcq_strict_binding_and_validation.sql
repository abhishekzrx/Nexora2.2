-- Migration: 08_mcq_strict_binding_and_validation.sql
-- Description: Strict Course -> Subject -> Chapter hierarchy binding for MCQs and Flashcards

-- 1. Ensure course_id column exists on mcqs and flashcards tables
ALTER TABLE IF EXISTS public.mcqs ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE IF EXISTS public.flashcards ADD COLUMN IF NOT EXISTS course_id TEXT;

-- 2. Safely backfill course_id from parent subjects if null or empty
UPDATE public.mcqs m
SET course_id = s.course_id
FROM public.subjects s
WHERE m.subject_id = s.id AND (m.course_id IS NULL OR m.course_id = '');

UPDATE public.flashcards f
SET course_id = s.course_id
FROM public.subjects s
WHERE f.subject_id = s.id AND (f.course_id IS NULL OR f.course_id = '');

-- 3. Composite performance indexes for fast hierarchical queries and strict isolation
CREATE INDEX IF NOT EXISTS idx_mcqs_course_subject_chapter ON public.mcqs (course_id, subject_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_subject_chapter ON public.mcqs (subject_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_chapter_id ON public.mcqs (chapter_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_subject_id ON public.mcqs (subject_id);
CREATE INDEX IF NOT EXISTS idx_mcqs_course_id ON public.mcqs (course_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_course_subject_chapter ON public.flashcards (course_id, subject_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject_chapter ON public.flashcards (subject_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_chapter_id ON public.flashcards (chapter_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject_id ON public.flashcards (subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_course_id ON public.flashcards (course_id);

-- 4. Constraint & Trigger: Enforce complete Course -> Subject -> Chapter hierarchy validation
CREATE OR REPLACE FUNCTION public.validate_mcq_hierarchy_binding()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_chapter_subject_id UUID;
  v_subject_course_id TEXT;
BEGIN
  -- Basic non-empty checks
  IF NEW.course_id IS NULL OR TRIM(NEW.course_id) = '' THEN
    RAISE EXCEPTION 'MCQ insertion rejected: course_id must not be empty';
  END IF;

  IF NEW.subject_id IS NULL OR TRIM(NEW.subject_id::text) = '' THEN
    RAISE EXCEPTION 'MCQ insertion rejected: subject_id must not be empty';
  END IF;

  IF NEW.chapter_id IS NULL OR TRIM(NEW.chapter_id::text) = '' THEN
    RAISE EXCEPTION 'MCQ insertion rejected: chapter_id must not be empty';
  END IF;

  -- 1. Validate Chapter exists and belongs to the given Subject
  SELECT subject_id INTO v_chapter_subject_id
  FROM public.chapters
  WHERE id = NEW.chapter_id;

  IF v_chapter_subject_id IS NOT NULL AND v_chapter_subject_id <> NEW.subject_id THEN
    RAISE EXCEPTION 'MCQ hierarchy violation: Chapter % belongs to Subject %, but MCQ has Subject %',
      NEW.chapter_id, v_chapter_subject_id, NEW.subject_id;
  END IF;

  -- 2. Validate Subject exists and belongs to the given Course
  SELECT course_id INTO v_subject_course_id
  FROM public.subjects
  WHERE id = NEW.subject_id;

  IF v_subject_course_id IS NOT NULL AND v_subject_course_id <> NEW.course_id THEN
    RAISE EXCEPTION 'MCQ hierarchy violation: Subject % belongs to Course %, but MCQ has Course %',
      NEW.subject_id, v_subject_course_id, NEW.course_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mcq_hierarchy ON public.mcqs;
CREATE TRIGGER trg_validate_mcq_hierarchy
BEFORE INSERT OR UPDATE ON public.mcqs
FOR EACH ROW
EXECUTE FUNCTION public.validate_mcq_hierarchy_binding();

-- 5. Row Level Security for MCQs & Flashcards
ALTER TABLE IF EXISTS public.mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flashcards ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users to their assigned courses, and Super Admin to all
DROP POLICY IF EXISTS "Allow select mcqs" ON public.mcqs;
CREATE POLICY "Allow select mcqs" ON public.mcqs
  FOR SELECT USING (
    course_id IN (
      SELECT jsonb_array_elements_text(assigned_courses)
      FROM public.user_profiles
      WHERE id = public.get_current_user_id()
    )
    OR public.is_current_user_super_admin()
    OR auth.role() = 'anon'
  );

-- Super admins have full CRUD on MCQs
DROP POLICY IF EXISTS "Super admins can insert mcqs" ON public.mcqs;
CREATE POLICY "Super admins can insert mcqs" ON public.mcqs
  FOR INSERT WITH CHECK (public.is_current_user_super_admin() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Super admins can update mcqs" ON public.mcqs;
CREATE POLICY "Super admins can update mcqs" ON public.mcqs
  FOR UPDATE USING (public.is_current_user_super_admin() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Super admins can delete mcqs" ON public.mcqs;
CREATE POLICY "Super admins can delete mcqs" ON public.mcqs
  FOR DELETE USING (public.is_current_user_super_admin() OR auth.role() = 'anon');

-- Flashcard RLS Policies
DROP POLICY IF EXISTS "Allow select flashcards" ON public.flashcards;
CREATE POLICY "Allow select flashcards" ON public.flashcards
  FOR SELECT USING (
    course_id IN (
      SELECT jsonb_array_elements_text(assigned_courses)
      FROM public.user_profiles
      WHERE id = public.get_current_user_id()
    )
    OR public.is_current_user_super_admin()
    OR auth.role() = 'anon'
  );

DROP POLICY IF EXISTS "Super admins can insert flashcards" ON public.flashcards;
CREATE POLICY "Super admins can insert flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (public.is_current_user_super_admin() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Super admins can update flashcards" ON public.flashcards;
CREATE POLICY "Super admins can update flashcards" ON public.flashcards
  FOR UPDATE USING (public.is_current_user_super_admin() OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Super admins can delete flashcards" ON public.flashcards;
CREATE POLICY "Super admins can delete flashcards" ON public.flashcards
  FOR DELETE USING (public.is_current_user_super_admin() OR auth.role() = 'anon');
