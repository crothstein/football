-- Migration: Add re-engagement email tracking
-- Run this in Supabase SQL Editor

-- Add created_at if it doesn't exist (for tracking signup time)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add re-engagement email tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reengagement_email_sent BOOLEAN DEFAULT FALSE;

-- Update existing profiles to set created_at if null
UPDATE public.profiles
SET created_at = NOW()
WHERE created_at IS NULL;

-- Update handle_new_user to include created_at
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster querying of eligible users
CREATE INDEX IF NOT EXISTS profiles_reengagement_idx 
ON public.profiles(created_at, reengagement_email_sent) 
WHERE reengagement_email_sent = FALSE;

-- Function to get users eligible for re-engagement email
-- Criteria: signed up 24-48h ago, haven't received email, have < 8 plays
CREATE OR REPLACE FUNCTION public.get_reengagement_eligible_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name
  FROM public.profiles p
  WHERE 
    p.reengagement_email_sent = FALSE
    AND p.email IS NOT NULL
    AND p.created_at >= NOW() - INTERVAL '48 hours'
    AND p.created_at <= NOW() - INTERVAL '24 hours'
    AND (
      SELECT COUNT(*) 
      FROM public.plays pl 
      JOIN public.playbooks pb ON pl.playbook_id = pb.id
      WHERE pb.owner_id = p.id
    ) < 8;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_reengagement_eligible_users() TO service_role;
