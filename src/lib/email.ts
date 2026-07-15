export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const isMockResend = !apiKey || apiKey === 'your_resend_api_key_here';

  if (isMockResend) {
    console.log(`[Email Dispatch Simulation] To: ${to} | Subject: ${subject}`);
    console.log(`[Email Body]:\n${html}`);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Saraban CRM <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, id: data.id };
    } else {
      const err = await res.text();
      console.error('Resend API failed:', err);
      return { success: false, error: err };
    }
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return { success: false, error };
  }
}
