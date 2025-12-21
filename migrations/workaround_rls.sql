-- Temporary workaround: Disable RLS on playbooks table
-- This allows shared playbooks to be fetched but removes security enforcement
-- TODO: Fix RLS policies properly with security definer functions

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view shared playbooks" ON public.playbooks;

-- Option 1: Completely disable RLS on playbooks (not recommended for production!)
-- ALTER TABLE public.playbooks DISABLE ROW LEVEL SECURITY;

-- Option 2: Allow all authenticated users to SELECT any playbook (better)
-- The application will handle permission checking
CREATE POLICY "Authenticated users can view all playbooks"
  ON public.playbooks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: This means ANY logged-in user can see ANY playbook via direct query
-- But the UI only shows playbooks the user owns or has been shared with
-- Real permission enforcement happens in the application layer for now
