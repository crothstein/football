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
    // Get request data
    const { email, playbookName, inviterName, permission } = await req.json()

    // Validate required fields
    if (!email || !playbookName || !inviterName || !permission) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare email content
    const permissionText = permission === 'view' ? 'view' : 'edit'

      < table width = "100%" cellpadding = "0" cellspacing = "0" >
        <tr>
        <td align="center" style = "padding: 20px 0;" >
          <a href="https://flagsketch.com" style = "display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;" >
            Open FlagSketch
              </a>
              </td>
              </tr>
              </table>
              </td>
              </tr>

              < !--Footer -->
                <tr>
                <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;" >
                  <p style="margin: 0; color: #6b7280; font-size: 14px;" >
                    FlagSketch - Flag Football Playbook Designer
                      </p>
                      < p style = "margin: 8px 0 0; color: #9ca3af; font-size: 12px;" >
                        Built by coaches for coaches
                          </p>
                          </td>
                          </tr>
                          </table>
                          </td>
                          </tr>
                          </table>
                          </body>
                          </html>
                            `

        const emailText = `
${ inviterName } shared a playbook with you on FlagSketch

    Playbook: "${playbookName}"
    Permission: ${ permission === 'view' ? 'View Only' : 'Can Edit' }

${
      permission === 'view'
      ? 'You can view plays and copy the playbook to your account.'
      : 'You can view, edit, and modify plays in this playbook.'
    }

Sign up or log in to FlagSketch to access the shared playbook:
    https://flagsketch.com
    `

        // Send email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ resendApiKey } `
            },
            body: JSON.stringify({
                from: 'FlagSketch <notifications@flagsketch.com>',
                to: [email],
                subject: `${ inviterName } shared "${playbookName}" with you`,
                html: emailHtml,
                text: emailText
            })
        })

        const resendData = await resendResponse.json()

        if (!resendResponse.ok) {
            console.error('Resend API error:', resendData)
            return new Response(
                JSON.stringify({ error: 'Failed to send email', details: resendData }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Return success
        return new Response(
            JSON.stringify({
                success: true,
                messageId: resendData.id
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Error in send-invitation function:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
