import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configuration
const MAX_ATTEMPTS = 5; // Max failed attempts before blocking
const WINDOW_MINUTES = 15; // Time window in minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP from headers (Cloudflare/proxy headers take precedence)
  const clientIp = 
    req.headers.get("cf-connecting-ip") || 
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    req.headers.get("x-real-ip") || 
    "unknown";

  console.log(`Login attempt from IP: ${clientIp}`);

  // Initialize Supabase client with service role for rate limiting checks
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if IP is rate limited
    const { data: isRateLimited, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        _ip_address: clientIp,
        _endpoint: "login",
        _max_attempts: MAX_ATTEMPTS,
        _window_minutes: WINDOW_MINUTES,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue anyway to not block legitimate users on DB errors
    } else if (isRateLimited) {
      console.warn(`IP ${clientIp} is rate limited for login attempts`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many failed login attempts. Please try again in ${WINDOW_MINUTES} minutes.`,
          rateLimited: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { token } = await req.json();
    const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");

    if (!TURNSTILE_SECRET_KEY) {
      throw new Error("TURNSTILE_SECRET_KEY is not configured");
    }

    if (!token) {
      // Record failed attempt (missing token)
      await supabase.rpc("record_rate_limit_attempt", {
        _ip_address: clientIp,
        _endpoint: "login",
        _success: false,
      });
      throw new Error("Token is required");
    }

    // Verify with Cloudflare Turnstile
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    if (!verifyResponse.ok) {
      // Record failed attempt
      await supabase.rpc("record_rate_limit_attempt", {
        _ip_address: clientIp,
        _endpoint: "login",
        _success: false,
      });
      throw new Error(`Turnstile verification failed: ${verifyResponse.statusText}`);
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.success) {
      // Record successful attempt (resets the rate limit counter logic)
      await supabase.rpc("record_rate_limit_attempt", {
        _ip_address: clientIp,
        _endpoint: "login",
        _success: true,
      });
      
      console.log(`Login CAPTCHA verified successfully for IP: ${clientIp}`);
      
      return new Response(
        JSON.stringify({ success: true, score: verifyData.score }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Record failed CAPTCHA attempt
      await supabase.rpc("record_rate_limit_attempt", {
        _ip_address: clientIp,
        _endpoint: "login",
        _success: false,
      });
      
      console.warn(`CAPTCHA verification failed for IP: ${clientIp}`, verifyData["error-codes"]);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: "CAPTCHA verification failed",
          errorCodes: verifyData["error-codes"],
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Turnstile verification error:", error);
    
    // Record failed attempt on error
    try {
      await supabase.rpc("record_rate_limit_attempt", {
        _ip_address: clientIp,
        _endpoint: "login",
        _success: false,
      });
    } catch (recordError) {
      console.error("Failed to record rate limit attempt:", recordError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
