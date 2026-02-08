import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AuthEmailRequest {
  email: string;
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      throw new Error("Email service not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) {
      console.error("SUPABASE_URL is not configured");
      throw new Error("Server configuration error");
    }

    const resend = new Resend(resendApiKey);

    const { email, token, token_hash, redirect_to, email_action_type }: AuthEmailRequest = await req.json();

    console.log(`Sending ${email_action_type} email to: ${email}`);

    // Build verification URL
    const verificationUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;

    let subject: string;
    let htmlContent: string;

    if (email_action_type === "signup" || email_action_type === "email") {
      subject = "Verify your Audio Salvage UK account";
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1d1d1d;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #28292b; border-radius: 12px; padding: 40px; border: 1px solid #555555;">
                <h1 style="color: #f59f0a; font-size: 24px; margin: 0 0 24px 0; text-align: center;">
                  Welcome to Audio Salvage UK
                </h1>
                
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  Thanks for signing up! Please verify your email address to complete your registration.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verificationUrl}" 
                     style="display: inline-block; background-color: #f59f0a; color: #000000; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                    Verify Email Address
                  </a>
                </div>
                
                <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #f59f0a; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                  ${verificationUrl}
                </p>
                
                <hr style="border: none; border-top: 1px solid #555555; margin: 32px 0;">
                
                <p style="color: #666666; font-size: 12px; text-align: center; margin: 0;">
                  If you didn't create an account, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (email_action_type === "recovery") {
      subject = "Reset your Audio Salvage UK password";
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1d1d1d;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background-color: #28292b; border-radius: 12px; padding: 40px; border: 1px solid #555555;">
                <h1 style="color: #f59f0a; font-size: 24px; margin: 0 0 24px 0; text-align: center;">
                  Password Reset Request
                </h1>
                
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  We received a request to reset your password. Click the button below to set a new password.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${verificationUrl}" 
                     style="display: inline-block; background-color: #f59f0a; color: #000000; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px;">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #f59f0a; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
                  ${verificationUrl}
                </p>
                
                <hr style="border: none; border-top: 1px solid #555555; margin: 32px 0;">
                
                <p style="color: #666666; font-size: 12px; text-align: center; margin: 0;">
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = "Audio Salvage UK - Email Verification";
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; padding: 20px;">
            <p>Click the link below to verify:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </body>
        </html>
      `;
    }

    const { data, error } = await resend.emails.send({
      from: "Audio Salvage UK <noreply@notification.audiosalvageuk.co.uk>",
      to: [email],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`Email sent successfully to ${email}, id: ${data?.id}`);

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
