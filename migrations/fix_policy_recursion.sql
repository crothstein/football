-- HOTFIX: Fix infinite recursion in playbook sharing policies
-- Run this in Supabase SQL Editor to fix the error

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view shared playbooks" ON public.playbooks;

-- Recreate it with a better approach that avoids recursion
CREATE POLICY "Users can view shared playbooks"
  ON public.playbooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playbook_shares
      WHERE playbook_shares.playbook_id = playbooks.id
        AND playbook_shares.shared_with_user_id = auth.uid()
    )
  );

-- Also update the plays policies to avoid similar issues
DROP POLICY IF EXISTS "Users can view plays in shared playbooks" ON public.plays;
DROP POLICY IF EXISTS "Users can edit plays in shared playbooks with edit permission" ON public.plays;
DROP POLICY IF EXISTS "Users can insert plays in shared playbooks with edit permission" ON public.plays;
DROP POLICY IF EXISTS "Users can delete plays in shared playbooks with edit permission" ON public.plays;

CREATE POLICY "Users can view plays in shared playbooks"
  ON public.plays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playbook_shares
      WHERE playbook_shares.playbook_id = plays.playbook_id
        AND playbook_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit plays in shared playbooks with edit permission"
  ON public.plays FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.playbook_shares
      WHERE playbook_shares.playbook_id = plays.playbook_id
        AND playbook_shares.shared_with_user_id = auth.uid()
        AND playbook_shares.permission = 'edit'
    )
  );

CREATE POLICY "Users can insert plays in shared playbooks with edit permission"
  ON public.plays FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playbook_shares
      WHERE playbook_shares.playbook_id = plays.playbook_id
        AND playbook_shares.shared_with_user_id = auth.uid()
        AND playbook_shares.permission = 'edit'
    )
  );

CREATE POLICY "Users can delete plays in shared playbooks with edit permission"
  ON public.plays FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playbook_shares
      WHERE playbook_shares.playbook_id = plays.playbook_id
        AND playbook_shares.shared_with_user_id = auth.uid()
        AND playbook_shares.permission = 'edit'
    )
  );
