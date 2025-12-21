-- TEMPORARY FIX: Disable sharing policies to get app working
-- This removes the new sharing policies while keeping core functionality

-- Drop all the new sharing-related policies
DROP POLICY IF EXISTS "Users can view shared playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Users can view plays in shared playbooks" ON public.plays;
DROP POLICY IF EXISTS "Users can edit plays in shared playbooks with edit permission" ON public.plays;
DROP POLICY IF EXISTS "Users can insert plays in shared playbooks with edit permission" ON public.plays;
DROP POLICY IF EXISTS "Users can delete plays in shared playbooks with edit permission" ON public.plays;

-- The app should now work normally for owned playbooks
-- Sharing will still be tracked in the database, but permissions won't be enforced yet
-- We'll debug and re-add these policies after confirming the app works
