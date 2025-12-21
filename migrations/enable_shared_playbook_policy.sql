-- Fix: Allow users to SELECT playbooks they have shares for
-- This replaces the problematic recursive policy with a working one

-- Drop the old policy if it exists
DROP POLICY IF EXISTS "Users can view shared playbooks" ON public.playbooks;

-- Create a non-recursive policy using a direct EXISTS check
CREATE POLICY "Users can view shared playbooks"
  ON public.playbooks 
  FOR SELECT
  USING (
    id IN (
      SELECT playbook_id 
      FROM public.playbook_shares 
      WHERE shared_with_user_id = auth.uid()
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'playbooks' 
  AND policyname = 'Users can view shared playbooks';
