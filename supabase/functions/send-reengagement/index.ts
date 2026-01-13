import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for test mode - allows sending to a specific email for testing
    let testEmail: string | null = null
    let testName: string = 'Coach'
    try {
      const body = await req.json()
      testEmail = body.test_email || null
      testName = body.test_name || 'Coach'
    } catch {
      // No body or invalid JSON is fine - just run normally
    }

    // If test_email is provided, send directly to that email
    if (testEmail) {
      console.log(`Test mode: sending to ${testEmail}`)
      const emailHtml = generateEmailHtml(testName)
      const emailText = generateEmailText(testName)

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'FlagSketch <notifications@flagsketch.com>',
          to: [testEmail],
          subject: 'Ready to build your playbook? 🏈',
          html: emailHtml,
          text: emailText
        })
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to send test email', details: resendData }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, test: true, sent_to: testEmail, messageId: resendData.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Normal mode: Get eligible users for re-engagement email
    const { data: eligibleUsers, error: queryError } = await supabase
      .rpc('get_reengagement_eligible_users')

    if (queryError) {
      console.error('Error fetching eligible users:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch eligible users', details: queryError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible users found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${eligibleUsers.length} eligible users for re-engagement email`)

    let sentCount = 0
    const errors: any[] = []

    for (const user of eligibleUsers) {
      const firstName = user.full_name?.split(' ')[0] || 'Coach'

      const emailHtml = generateEmailHtml(firstName)
      const emailText = generateEmailText(firstName)

      // Send email via Resend
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'FlagSketch <notifications@flagsketch.com>',
          to: [user.email],
          subject: 'Ready to build your playbook? 🏈',
          html: emailHtml,
          text: emailText
        })
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error(`Failed to send email to ${user.email}:`, resendData)
        errors.push({ email: user.email, error: resendData })
        continue
      }

      // Mark user as having received the email
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ reengagement_email_sent: true })
        .eq('id', user.user_id)

      if (updateError) {
        console.error(`Failed to update profile for ${user.email}:`, updateError)
      }

      sentCount++
      console.log(`Sent re-engagement email to ${user.email}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: eligibleUsers.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-reengagement function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateEmailHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .template-grid {
      display: flex;
      justify-content: space-between;
      margin: 25px 0;
      text-align: center;
    }
    .template-card {
      flex: 1;
      margin: 0 8px;
      padding: 20px 10px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 12px;
      text-decoration: none;
    }
    .template-card h3 {
      margin: 0 0 5px 0;
      color: #1e40af;
      font-size: 24px;
      font-weight: 700;
    }
    .template-card p {
      margin: 0;
      color: #3b82f6;
      font-size: 13px;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 10px 0 20px 0;
    }
    .footer {
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://flagsketch.com/images/logo.png" alt="FlagSketch" class="logo">
    </div>
    <div class="content">
      <h1 style="margin-top: 0; color: #1f2937; font-size: 24px;">Hey ${firstName}, your playbook is waiting! 🏈</h1>
      <p style="font-size: 16px; color: #4b5563;">
        You signed up for FlagSketch—but your playbook still isn't fully built out!
      </p>
      <p style="font-size: 16px; color: #4b5563;">
        The fastest way to fill it is with our <strong>free play templates</strong>. Add any play with one click, then customize it for your team:
      </p>
      
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
        <tr>
          <td width="33%" style="padding: 0 5px;">
            <a href="https://flagsketch.com/play-templates/5v5/" style="display: block; padding: 20px 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; text-decoration: none; text-align: center;">
              <span style="display: block; color: #1e40af; font-size: 24px; font-weight: 700; margin-bottom: 5px;">5v5</span>
              <span style="display: block; color: #3b82f6; font-size: 13px;">Browse Plays →</span>
            </a>
          </td>
          <td width="33%" style="padding: 0 5px;">
            <a href="https://flagsketch.com/play-templates/6v6/" style="display: block; padding: 20px 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; text-decoration: none; text-align: center;">
              <span style="display: block; color: #1e40af; font-size: 24px; font-weight: 700; margin-bottom: 5px;">6v6</span>
              <span style="display: block; color: #3b82f6; font-size: 13px;">Browse Plays →</span>
            </a>
          </td>
          <td width="33%" style="padding: 0 5px;">
            <a href="https://flagsketch.com/play-templates/7v7/" style="display: block; padding: 20px 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; text-decoration: none; text-align: center;">
              <span style="display: block; color: #1e40af; font-size: 24px; font-weight: 700; margin-bottom: 5px;">7v7</span>
              <span style="display: block; color: #3b82f6; font-size: 13px;">Browse Plays →</span>
            </a>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://flagsketch.com/app.html" class="button">
          Start Your Playbook →
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        Questions? Just reply to this email—we read every message.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 10px 0;">Sketch routes in seconds, print wristbands instantly</p>
      <p style="margin: 0;">© 2025 FlagSketch. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
}

function generateEmailText(firstName: string): string {
  return `
Hey ${firstName}, your playbook is waiting! 🏈

You signed up for FlagSketch—but your playbook still isn't fully built out!

The fastest way to fill it is with our free play templates. Add any play with one click, then customize it for your team:

5v5 Plays: https://flagsketch.com/play-templates/5v5/
6v6 Plays: https://flagsketch.com/play-templates/6v6/
7v7 Plays: https://flagsketch.com/play-templates/7v7/

Start Your Playbook: https://flagsketch.com/app.html

Questions? Just reply to this email—we read every message.

---
FlagSketch - Sketch routes in seconds, print wristbands instantly
© 2025 FlagSketch. All rights reserved.
`
}
