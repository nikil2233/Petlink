-- ENABLE "GOD MODE" FOR ADMINS
-- RLS works by "OR" logic. If ANY policy says "YES", access is granted.
-- We will add a policy to each major table that says: "Allow ALL actions if user is_admin"

-- 1. Profiles (Banning/Editing Users)
CREATE POLICY "Admins can update any profile" ON profiles
FOR UPDATE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 2. Success Stories (Deleting inappropriate stories)
CREATE POLICY "Admins can delete any story" ON success_stories
FOR DELETE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 3. Success Story Comments (Removing bad comments)
CREATE POLICY "Admins can delete any comment" ON story_comments
FOR DELETE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 4. Lost & Found Pets (Removing fake alerts)
CREATE POLICY "Admins can update any lost pet" ON lost_pets
FOR UPDATE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can delete any lost pet" ON lost_pets
FOR DELETE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 5. Adoption Listings (Removing fake pets)
CREATE POLICY "Admins can update any adoption" ON adoptions
FOR UPDATE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can delete any adoption" ON adoptions
FOR DELETE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- 6. Rescuer Reports (Managing reports)
CREATE POLICY "Admins can update any report" ON reports
FOR UPDATE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can delete any report" ON reports
FOR DELETE USING (
  (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
