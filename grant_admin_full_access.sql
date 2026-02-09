-- 1. Helper function for admin check (Safe from recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. ENABLE RLS ON ALL TABLES (Just for safety)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;


-- 3. PROFILES: Admin Can Do EVERYTHING
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles 
FOR ALL USING (is_admin());


-- 4. REPORTS: Admin Can Delete/Edit Any Report
DROP POLICY IF EXISTS "Admins can manage reports" ON reports;
CREATE POLICY "Admins can manage reports" ON reports 
FOR ALL USING (is_admin());


-- 5. LOST PETS: Admin Can Delete/Edit Any Lost Pet Post
DROP POLICY IF EXISTS "Admins can manage lost_pets" ON lost_pets;
CREATE POLICY "Admins can manage lost_pets" ON lost_pets 
FOR ALL USING (is_admin());


-- 6. ADOPTIONS: Admin Can Delete/Edit Any Adoption Listing
DROP POLICY IF EXISTS "Admins can manage adoptions" ON adoptions;
CREATE POLICY "Admins can manage adoptions" ON adoptions 
FOR ALL USING (is_admin());


-- 7. APPOINTMENTS: Admin Can Delete/Edit Any Appointment
DROP POLICY IF EXISTS "Admins can manage appointments" ON appointments;
CREATE POLICY "Admins can manage appointments" ON appointments 
FOR ALL USING (is_admin());


-- 8. NOTIFICATIONS: Admin Can Delete/Send Notifications
DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
CREATE POLICY "Admins can manage notifications" ON notifications 
FOR ALL USING (is_admin());


-- 9. MESSAGES: Admin Can Delete Messages (Optional/If desired)
DROP POLICY IF EXISTS "Admins can manage messages" ON messages;
CREATE POLICY "Admins can manage messages" ON messages 
FOR ALL USING (is_admin());
