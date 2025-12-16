-- Add description column to plays table
ALTER TABLE plays
ADD COLUMN description TEXT;

-- Update RLS policy if needed (usually implicit for select *, but good to be aware)
