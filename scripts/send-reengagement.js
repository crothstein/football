/**
 * One-time script to send re-engagement emails to users who signed up
 * but never verified their email.
 * 
 * Usage:
 *   1. Set your RESEND_API_KEY environment variable
 *   2. Run: node scripts/send-reengagement.js
 * 
 * Or run with inline key:
 *   RESEND_API_KEY=re_xxxxx node scripts/send-reengagement.js
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error('ERROR: RESEND_API_KEY environment variable is required');
    console.log('Usage: RESEND_API_KEY=re_xxxxx node scripts/send-reengagement.js');
    process.exit(1);
}

// Users who need re-engagement emails
const USERS_TO_CONTACT = [
    'ramirito.diazv8@gmail.com',
    'bradyhilligoss@gmail.com',
    'furmity.impact@gmail.com',
];

const EMAIL_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); padding: 40px 20px; text-align: center;">
            <img src="https://flagsketch.com/images/logo.png" alt="FlagSketch" style="max-width: 150px; height: auto;">
        </div>
        <div style="padding: 40px 30px; color: #333333; line-height: 1.6;">
            <h1 style="margin-top: 0; color: #1f2937; font-size: 24px;">Hey Coach, your playbook is waiting! 🏈</h1>
            <p style="font-size: 16px; color: #4b5563;">
                You signed up for FlagSketch recently—we noticed you might have had trouble verifying your email. 
                Good news: <strong>we've fixed that!</strong> You can now log in directly without email verification.
            </p>
            <p style="font-size: 16px; color: #4b5563;">
                Jump in and start building your playbook with our <strong>free play templates</strong>. Add any play with one
                click, then customize it for your team:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                    <td width="33%" style="padding: 0 5px;">
                        <a href="https://flagsketch.com/play-templates/5v5/"
                            style="display: block; padding: 20px 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; text-decoration: none; text-align: center;">
                            <span style="display: block; color: #1e40af; font-size: 24px; font-weight: 700; margin-bottom: 5px;">5v5</span>
                            <span style="display: block; color: #3b82f6; font-size: 13px;">Browse Plays →</span>
                        </a>
                    </td>
                    <td width="33%" style="padding: 0 5px;">
                        <a href="https://flagsketch.com/play-templates/6v6/"
                            style="display: block; padding: 20px 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; text-decoration: none; text-align: center;">
                            <span style="display: block; color: #1e40af; font-size: 24px; font-weight: 700; margin-bottom: 5px;">6v6</span>
                            <span style="display: block; color: #3b82f6; font-size: 13px;">Browse Plays →</span>
                        </a>
                    </td>
                    <td width="33%" style="padding: 0 5px;">
                        <a href="https://flagsketch.com/play-templates/7v7/"
                            style="display: block; padding: 20px 10px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; text-decoration: none; text-align: center;">
                            <span style="display: block; color: #1e40af; font-size: 24px; font-weight: 700; margin-bottom: 5px;">7v7</span>
                            <span style="display: block; color: #3b82f6; font-size: 13px;">Browse Plays →</span>
                        </a>
                    </td>
                </tr>
            </table>

            <div style="text-align: center; margin: 30px 0;">
                <a href="https://flagsketch.com/app.html" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Log In & Start Building →
                </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Questions? Just reply to this email—we read every message.
            </p>
        </div>
        <div style="padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 10px 0;">Sketch routes in seconds, print wristbands instantly</p>
            <p style="margin: 0;">© 2025 FlagSketch. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

async function sendEmail(to) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'FlagSketch <support@flagsketch.com>',
            to: [to],
            subject: 'Your FlagSketch account is ready! 🏈',
            html: EMAIL_HTML,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
    }

    return data;
}

async function main() {
    console.log('🏈 FlagSketch Re-engagement Email Sender\n');
    console.log(`Sending to ${USERS_TO_CONTACT.length} users...\n`);

    for (const email of USERS_TO_CONTACT) {
        try {
            const result = await sendEmail(email);
            console.log(`✅ Sent to ${email} (ID: ${result.id})`);
        } catch (error) {
            console.error(`❌ Failed to send to ${email}: ${error.message}`);
        }
    }

    console.log('\n✨ Done!');
}

main();
