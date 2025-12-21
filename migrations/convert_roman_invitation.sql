-- Manual fix: Convert invitation to share for roman.r.rothstein@gmail.com
-- Run this in Supabase SQL Editor

-- First, let's check what we have
SELECT 'Invitation:', * FROM playbook_invitations WHERE email = 'roman.r.rothstein@gmail.com';
SELECT 'User Profile:', * FROM profiles WHERE email = 'roman.r.rothstein@gmail.com';

-- Convert invitation to share
INSERT INTO playbook_shares (playbook_id, shared_with_user_id, permission, shared_by_user_id)
SELECT 
  pi.playbook_id,
  p.id as shared_with_user_id,
  pi.permission,
  pi.invited_by_user_id
FROM playbook_invitations pi
JOIN profiles p ON p.email = pi.email
WHERE pi.email = 'roman.r.rothstein@gmail.com'
  AND pi.status = 'pending'
ON CONFLICT (playbook_id, shared_with_user_id) DO NOTHING;

-- Mark invitation as accepted
UPDATE playbook_invitations 
SET status = 'accepted',
    accepted_by_user_id = (SELECT id FROM profiles WHERE email = 'roman.r.rothstein@gmail.com')
WHERE email = 'roman.r.rothstein@gmail.com'
  AND status = 'pending';

-- Verify the share was created
SELECT 'Share created:', * 
FROM playbook_shares
WHERE shared_with_user_id = (SELECT id FROM profiles WHERE email = 'roman.r.rothstein@gmail.com');
