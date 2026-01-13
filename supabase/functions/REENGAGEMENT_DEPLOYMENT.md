# Re-engagement Email Deployment Guide

Automated email sent 1 day after signup to users with fewer than 8 plays.

## Deployment Steps

### 1. Run Database Migration

In Supabase SQL Editor, run:
```sql
-- migrations/add_reengagement_tracking.sql
```

This adds:
- `reengagement_email_sent` column to profiles
- `created_at` column to profiles
- `get_reengagement_eligible_users()` function

### 2. Deploy Edge Function

```bash
cd /Users/chrisrothstein/.gemini/antigravity/scratch/flag-football-playmaker
supabase functions deploy send-reengagement
```

### 3. Set Up Cron Job

In Supabase SQL Editor, update and run `migrations/setup_reengagement_cron.sql`:

1. Replace `<your-project-ref>` with your Supabase project ref (from URL)
2. Replace `<your-anon-key>` with your anon/public key

```sql
SELECT cron.schedule(
  'send-reengagement-emails',
  '0 * * * *',  -- every hour
  $$
  SELECT net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-reengagement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <your-anon-key>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 4. Verify

```sql
-- Check cron job exists
SELECT * FROM cron.job;

-- Check job executions
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

## Manual Test

```bash
curl -X POST \
  'https://<your-project-ref>.supabase.co/functions/v1/send-reengagement' \
  -H 'Authorization: Bearer <your-anon-key>' \
  -H 'Content-Type: application/json'
```

## Monitoring

- **Resend Dashboard**: Check email delivery at resend.com/emails
- **Supabase Logs**: Functions → send-reengagement → Logs
- **Cron History**: `SELECT * FROM cron.job_run_details`
