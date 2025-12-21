-- Debug: Check if the share data is correct
-- Run this to verify everything is set up properly

-- 1. Get the user ID for roman.r.rothstein@gmail.com
SELECT 'User ID:', id, email, full_name 
FROM profiles 
WHERE email = 'roman.r.rothstein@gmail.com';

-- 2. Check the share exists and has correct data
SELECT 'Share Details:', 
  ps.id as share_id,
  ps.playbook_id,
  ps.shared_with_user_id,
  ps.permission,
  ps.created_at
FROM playbook_shares ps
WHERE ps.shared_with_user_id = (SELECT id FROM profiles WHERE email = 'roman.r.rothstein@gmail.com');

-- 3. Verify the playbook exists and get its details
SELECT 'Playbook Details:', 
  pb.id,
  pb.owner_id,
  pb.created_at,
  pb.updated_at
FROM playbooks pb
WHERE pb.id IN (
  SELECT playbook_id 
  FROM playbook_shares 
  WHERE shared_with_user_id = (SELECT id FROM profiles WHERE email = 'roman.r.rothstein@gmail.com')
);

-- 4. Check what getPlaybooks() should return for this user
-- Owned playbooks (should be none for new user)
SELECT 'Owned Playbooks:', COUNT(*) 
FROM playbooks 
WHERE owner_id = (SELECT id FROM profiles WHERE email = 'roman.r.rothstein@gmail.com');

-- Shared playbooks (should be 1+)
SELECT 'Shared Playbooks Count:', COUNT(*) 
FROM playbook_shares 
WHERE shared_with_user_id = (SELECT id FROM profiles WHERE email = 'roman.r.rothstein@gmail.com');
