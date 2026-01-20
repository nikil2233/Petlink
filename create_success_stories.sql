-- Success Stories Feature Schema

-- 1. Create Success Stories Table
CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Everyone can view
CREATE POLICY "Stories are viewable by everyone" 
  ON public.success_stories FOR SELECT USING (true);

-- Only Rescuers and Shelters can insert
CREATE POLICY "NGOs can create stories" 
  ON public.success_stories FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('rescuer', 'shelter'))
  );

-- Authors can update/delete their own stories
CREATE POLICY "Authors can update own stories" 
  ON public.success_stories FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own stories" 
  ON public.success_stories FOR DELETE USING (auth.uid() = author_id);


-- 4. Storage Bucket for Story Images
INSERT INTO storage.buckets (id, name, public) VALUES ('story-images', 'story-images', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public Story Images" ON storage.objects FOR SELECT USING (bucket_id = 'story-images');
CREATE POLICY "NGOs Upload Story Images" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'story-images' AND 
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('rescuer', 'shelter'))
);
