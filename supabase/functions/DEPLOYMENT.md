# Supabase Edge Function Deployment Instructions

## Prerequisites

1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Login to Supabase:
```bash
supabase login
```

## Deploy the Function

1. **Link your project** (first time only):
```bash
cd /Users/chrisrothstein/.gemini/antigravity/scratch/flag-football-playmaker
supabase link --project-ref <your-project-ref>
```

Your project ref is in your Supabase URL: `https://<project-ref>.supabase.co`

2. **Set the Resend API Key as a secret**:
```bash
supabase secrets set RESEND_API_KEY=re_KuQfBebn_2bfwNff7ibxmTac3BrVApQSo
```

3. **Deploy the function**:
```bash
supabase functions deploy send-invitation
```

4. **Get the function URL**:
The function will be available at:
```
https://<your-project-ref>.supabase.co/functions/v1/send-invitation
```

## Testing the Function

You can test it with curl:

```bash
curl -i --location --request POST \
  'https://<your-project-ref>.supabase.co/functions/v1/send-invitation' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"email":"test@example.com","playbookName":"Test Playbook","inviterName":"John Doe","permission":"view"}'
```

## Important Notes

- The function sends emails from `notifications@flagsketch.com`
- **You need to verify this domain in Resend** or it will only send to verified email addresses
- To verify your domain, go to Resend dashboard → Domains → Add Domain
- Alternatively, for testing, use Resend's sandbox which sends to your verified email only

## Updating the Secret

If you need to update the API key:
```bash
supabase secrets set RESEND_API_KEY=<new-key>
```

Then redeploy:
```bash
supabase functions deploy send-invitation
```
