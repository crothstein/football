-- Proper RLS Implementation using Security Definer Functions
-- This avoids infinite recursion by using functions that bypass RLS

-- Step 1: Create helper function to check if user has access to a playbook
-- SECURITY DEFINER allows this function to bypass RLS and check playbook_shares
CREATE OR REPLACE FUNCTION public.user_has_playbook_access(playbook_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the playbook OR has a share
  RETURN EXISTS (
    SELECT 1 FROM playbooks 
    WHERE id = playbook_id_param 
      AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM playbook_shares
    WHERE playbook_id = playbook_id_param
      AND shared_with_user_id = auth.uid()
  );
END;
$$;

-- Step 2: Create helper function to check if user has edit permission
CREATE OR REPLACE FUNCTION public.user_can_edit_playbook(playbook_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user owns the playbook OR has 'edit' permission share
  RETURN EXISTS (
    SELECT 1 FROM playbooks 
    WHERE id = playbook_id_param 
      AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM playbook_shares
    WHERE playbook_id = playbook_id_param
      AND shared_with_user_id = auth.uid()
      AND permission = 'edit'
  );
END;
$$;

-- Step 3: Drop all existing policies before creating new ones
DROP POLICY IF EXISTS "Authenticated users can view all playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can insert their own playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can update own playbook" ON public.playbooks;
DROP POLICY IF EXISTS "Users can delete own playbook" ON public.playbooks;
DROP POLICY IF EXISTS "Users can view owned and shared playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can update owned playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can delete their own playbooks" ON public.playbooks;

-- Step 4: Create proper RLS policies using the security definer functions

-- Policy for viewing playbooks
CREATE POLICY "Users can view owned and shared playbooks"
  ON public.playbooks
  FOR SELECT
  USING (
    owner_id = auth.uid() 
    OR public.user_has_playbook_access(id)
  );

-- Policy for updating playbooks
CREATE POLICY "Users can update owned playbooks"
  ON public.playbooks
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Policy for inserting playbooks
CREATE POLICY "Users can insert their own playbooks"
  ON public.playbooks
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Policy for deleting playbooks
CREATE POLICY "Users can delete their own playbooks"
  ON public.playbooks
  FOR DELETE
  USING (owner_id = auth.uid());

-- Step 5: Create RLS policies for plays table

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view plays in shared playbooks" ON public.plays;
DROP POLICY IF EXISTS "Users can edit plays in shared playbooks with edit permission" ON public.plays;
DROP POLICY IF EXISTS "Users can insert plays in shared playbooks with edit permission" ON public.plays;
DROP POLICY IF EXISTS "Users can delete plays in shared playbooks with edit permission" ON public.plays;

-- View plays
CREATE POLICY "Users can view plays in accessible playbooks"
  ON public.plays
  FOR SELECT
  USING (public.user_has_playbook_access(playbook_id));

-- Insert plays (requires edit permission)
CREATE POLICY "Users can insert plays in editable playbooks"
  ON public.plays
  FOR INSERT
  WITH CHECK (public.user_can_edit_playbook(playbook_id));

-- Update plays (requires edit permission)
CREATE POLICY "Users can update plays in editable playbooks"
  ON public.plays
  FOR UPDATE
  USING (public.user_can_edit_playbook(playbook_id));

-- Delete plays (requires edit permission)
CREATE POLICY "Users can delete plays in editable playbooks"
  ON public.plays
  FOR DELETE
  USING (public.user_can_edit_playbook(playbook_id));

-- Step 6: Verify the policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('playbooks', 'plays')
ORDER BY tablename, policyname;
