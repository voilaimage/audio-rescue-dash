import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limit configuration
const RATE_LIMITS: Record<string, { maxAttempts: number; windowMinutes: number }> = {
  login: { maxAttempts: 5, windowMinutes: 15 },
  register: { maxAttempts: 3, windowMinutes: 30 }, // Stricter for registration
};

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function recordAttempt(
  supabase: any,
  ipAddress: string,
  endpoint: string,
  success: boolean
): Promise<void> {
  try {
    await supabase.rpc("record_rate_limit_attempt", {
      _ip_address: ipAddress,
      _endpoint: endpoint,
      _success: success,
    });
  } catch (error) {
    console.error("Failed to record rate limit attempt:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  
  // Initialize Supabase client with service role for rate limiting checks
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { token, endpoint: requestedEndpoint } = await req.json();
    
    // Determine which endpoint to use for rate limiting (default to "login")
    const endpoint = requestedEndpoint === "register" ? "register" : "login";
    const rateLimit = RATE_LIMITS[endpoint];
    
    console.log(`${endpoint} attempt from IP: ${clientIp}`);

    // Check if IP is rate limited
    const { data: isRateLimited, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        _ip_address: clientIp,
        _endpoint: endpoint,
        _max_attempts: rateLimit.maxAttempts,
        _window_minutes: rateLimit.windowMinutes,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue anyway to not block legitimate users on DB errors
    } else if (isRateLimited) {
      console.warn(`IP ${clientIp} is rate limited for ${endpoint} attempts`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many failed ${endpoint} attempts. Please try again in ${rateLimit.windowMinutes} minutes.`,
          rateLimited: true,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");

    if (!TURNSTILE_SECRET_KEY) {
      throw new Error("TURNSTILE_SECRET_KEY is not configured");
    }

    if (!token) {
      await recordAttempt(supabase, clientIp, endpoint, false);
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
      await recordAttempt(supabase, clientIp, endpoint, false);
      throw new Error(`Turnstile verification failed: ${verifyResponse.statusText}`);
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.success) {
      await recordAttempt(supabase, clientIp, endpoint, true);
      console.log(`${endpoint} CAPTCHA verified successfully for IP: ${clientIp}`);
      
      return new Response(
        JSON.stringify({ success: true, score: verifyData.score }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      await recordAttempt(supabase, clientIp, endpoint, false);
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