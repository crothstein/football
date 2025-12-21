# Email Integration - Quick Start Guide

## ✅ What's Ready

1. **Edge Function Created**: `supabase/functions/send-invitation/index.ts`
2. **Email Template**: Professional HTML email with FlagSketch branding
3. **UI Integration**: Automatically sends emails when inviting new users

## 🚀 Deployment Steps

### Step 1: Install Supabase CLI (if not already installed)

```bash
brew install supabase/tap/supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

Navigate to your project directory:
```bash
cd /Users/chrisrothstein/.gemini/antigravity/scratch/flag-football-playmaker
```

Link to your Supabase project (get project ref from your Supabase URL):
```bash
supabase link --project-ref <your-project-ref>
```

### Step 4: Set API Key as Secret

```bash
supabase secrets set RESEND_API_KEY=re_KuQfBebn_2bfwNff7ibxmTac3BrVApQSo
```

### Step 5: Deploy the Function

```bash
supabase functions deploy send-invitation
```

## ⚠️ Important: Email Domain Setup

The function sends emails from `notifications@flagsketch.com`. You have two options:

### Option A: Use Your Domain (Recommended for Production)

1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter `flagsketch.com`
4. Add the DNS records shown (SPF, DKIM, etc.)
5. Wait for verification (usually 5-15 minutes)

### Option B: Use Resend Sandbox (For Testing Only)

- No domain setup needed
- **Limitation**: Can only send to verified email addresses
- To verify an email:
  1. Go to [Resend Dashboard → Emails](https://resend.com/emails)
  2. Click "Verify Email"
  3. Enter your test email
  4. Check inbox and click verification link

## 🧪 Testing

### Test the Edge Function directly:

```bash
curl -i --location --request POST \
  'https://<your-project-ref>.supabase.co/functions/v1/send-invitation' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "email":"your-test@email.com",
    "playbookName":"Test Playbook",
    "inviterName":"John Doe",
    "permission":"view"
  }'
```

### Test via the UI:

1. Open FlagSketch
2. Create/open a playbook
3. Click Settings → Sharing
4. Click "Share with..."
5. Enter an email address
6. Click Send
7. Check the email inbox!

## 📧 Email Preview

The invitation email includes:
- **Subject**: `[Inviter Name] shared "[Playbook Name]" with you`
- **Professional branded HTML design** with gradient header
- **Permission level** clearly displayed (View Only or Can Edit)
- **Call-to-action button** linking to flagsketch.com
- **Plain text fallback** for email clients that don't support HTML

## 🔍 Monitoring

Check email delivery status in:
- **Resend Dashboard**: [resend.com/emails](https://resend.com/emails)
- **Supabase Logs**: Functions → send-invitation → Logs

## 🐛 Troubleshooting

**Email not sending?**
- Check Supabase function logs for errors
- Verify RESEND_API_KEY is set correctly: `supabase secrets list`
- Check Resend dashboard for failed deliveries
- Ensure domain is verified (or using sandbox mode with verified email)

**Domain not verifying?**
- DNS changes can take up to 48 hours
- Use `dig` to check DNS records: `dig TXT flagsketch.com`
- Contact Resend support if issues persist

**Function not deploying?**
- Ensure you're in the correct directory
- Check you're linked to the right project: `supabase projects list`
- Try re-linking: `supabase unlink` then `supabase link --project-ref <ref>`

## ✨ Next Steps

After deployment:
1. Test invitation with your own email
2. Verify domain in Resend (if using flagsketch.com)
3. Test the full signup flow
4. Monitor first few invitations in Resend dashboard
