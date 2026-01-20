-- Likes Feature for Success Stories

-- 1. Create Likes Table (Composite PK ensures 1 like per user/story)
CREATE TABLE IF NOT EXISTS public.story_likes (
  story_id UUID REFERENCES public.success_stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (story_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- 3. Policies
CREATE POLICY "Likes are viewable by everyone" 
  ON public.story_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like" 
  ON public.story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" 
  ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

-- 4. Auto-update likes_count on success_stories
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.success_stories
  SET likes_count = likes_count + 1
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_removed_like()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.success_stories
  SET likes_count = likes_count - 1
  WHERE id = OLD.story_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Insert
DROP TRIGGER IF EXISTS on_like_added on public.story_likes;
CREATE TRIGGER on_like_added
  AFTER INSERT ON public.story_likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_like();

-- Trigger for Delete
DROP TRIGGER IF EXISTS on_like_removed on public.story_likes;
CREATE TRIGGER on_like_removed
  AFTER DELETE ON public.story_likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_removed_like();
