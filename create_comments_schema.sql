-- Comments for Success Stories

-- 1. Create Comments Table
CREATE TABLE IF NOT EXISTS public.story_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.success_stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Everyone can view comments
CREATE POLICY "Comments are viewable by everyone" 
  ON public.story_comments FOR SELECT USING (true);

-- Authenticated users can comment
CREATE POLICY "Authenticated users can comment" 
  ON public.story_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authors can delete their own comments
CREATE POLICY "Users can delete their own comments" 
  ON public.story_comments FOR DELETE USING (auth.uid() = user_id);
