-- Migration: 04_add_exam_date_to_courses.sql
-- Description: Adds exam_date column to the courses table in Supabase for persistent countdown calculation across devices.

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS exam_date TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
