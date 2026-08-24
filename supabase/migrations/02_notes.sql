-- Migration: 02_notes.sql
-- Description: Create notes table and storage bucket for Course -> Subject -> Chapter study notes.

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published', -- 'published' | 'draft'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast scoped queries by course, subject, and chapter
CREATE INDEX IF NOT EXISTS idx_notes_chapter ON public.notes (chapter_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON public.notes (subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_course ON public.notes (course_id);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Permissive policies for PostgREST client operations
DROP POLICY IF EXISTS "Allow select notes" ON public.notes;
CREATE POLICY "Allow select notes" ON public.notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert notes" ON public.notes;
CREATE POLICY "Allow insert notes" ON public.notes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update notes" ON public.notes;
CREATE POLICY "Allow update notes" ON public.notes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete notes" ON public.notes;
CREATE POLICY "Allow delete notes" ON public.notes FOR DELETE USING (true);

-- Storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes-images', 'notes-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public select notes-images" ON storage.objects;
CREATE POLICY "Allow public select notes-images" ON storage.objects FOR SELECT USING (bucket_id = 'notes-images');

DROP POLICY IF EXISTS "Allow public insert notes-images" ON storage.objects;
CREATE POLICY "Allow public insert notes-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes-images');

DROP POLICY IF EXISTS "Allow public update notes-images" ON storage.objects;
CREATE POLICY "Allow public update notes-images" ON storage.objects FOR UPDATE USING (bucket_id = 'notes-images');

DROP POLICY IF EXISTS "Allow public delete notes-images" ON storage.objects;
CREATE POLICY "Allow public delete notes-images" ON storage.objects FOR DELETE USING (bucket_id = 'notes-images');
