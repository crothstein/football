-- Migration: Setup pg_cron job for re-engagement emails
-- Run this in Supabase SQL Editor AFTER deploying the Edge Function
-- Note: pg_cron extension must be enabled first

-- Enable pg_net extension if not already (needed to make HTTP calls from cron)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get your Supabase project URL and anon key from your project settings
-- Replace <your-project-ref> and <your-anon-key> below

-- Schedule the re-engagement email job to run every hour
SELECT cron.schedule(
  'send-reengagement-emails',  -- job name
  '0 * * * *',                  -- every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-reengagement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseWJ0b216ZGVsa3dzYnNtbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzM2MTgsImV4cCI6MjA4MTA0OTYxOH0.YsHg4DE-tcUiK2n5q6Fu1ysIXvwo-wXnxs8EU7Dv5-c>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To view job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To unschedule the job if needed:
-- SELECT cron.unschedule('send-reengagement-emails');
