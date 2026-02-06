import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DriverSetupRequest = {
  invite_token: string;
  password: string;
};

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getClientIp(req: Request): string {
  // Check common headers for client IP (in order of preference)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to a hash of user-agent + other headers for basic fingerprinting
  const userAgent = req.headers.get("user-agent") || "unknown";
  return `ua-${userAgent.substring(0, 50)}`;
}

async function findUserIdByEmail(supabaseAdmin: any, email: string) {
  const perPage = 200;
  // Iterate a handful of pages to find the user. This should be plenty for this app.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id as string;

    if (data.users.length < perPage) break;
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = getClientIp(req);
  const endpoint = "driver-setup";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Server not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check rate limit before processing
    const { data: isBlocked, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_rate_limit",
      {
        _ip_address: clientIp,
        _endpoint: endpoint,
        _max_attempts: 5,
        _window_minutes: 15,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check error:", rateLimitError);
      // Continue processing if rate limit check fails (fail open for availability)
    } else if (isBlocked) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ 
          error: "Too many attempts. Please try again later.",
          retry_after: 900 // 15 minutes in seconds
        }),
        {
          status: 429,
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "900",
            ...corsHeaders 
          },
        }
      );
    }

    const { invite_token, password }: DriverSetupRequest = await req.json();
    
    // Enhanced input validation
    if (!invite_token || typeof invite_token !== "string") {
      await recordAttempt(supabaseAdmin, clientIp, endpoint, false);
      return new Response(JSON.stringify({ error: "Missing or invalid invite_token" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // Validate token format (should be 32-char hex string)
    if (!/^[a-f0-9]{32}$/.test(invite_token)) {
      await recordAttempt(supabaseAdmin, clientIp, endpoint, false);
      console.warn(`Invalid token format from IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: "Invalid invite token format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    if (password.length > 72) {
      return new Response(JSON.stringify({ error: "Password must be 72 characters or less" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate password complexity: lowercase, uppercase, digits, and symbols
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasLowercase || !hasUppercase || !hasDigit || !hasSymbol) {
      const missing = [];
      if (!hasLowercase) missing.push("lowercase letter");
      if (!hasUppercase) missing.push("uppercase letter");
      if (!hasDigit) missing.push("digit");
      if (!hasSymbol) missing.push("symbol");
      return new Response(JSON.stringify({ 
        error: `Password must contain: ${missing.join(", ")}` 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("driver_invites")
      .select("id, contact_name, phone, status, coverage_areas")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (inviteError || !invite) {
      await recordAttempt(supabaseAdmin, clientIp, endpoint, false);
      console.warn(`Invalid invite token attempt from IP: ${clientIp}`);
      return new Response(JSON.stringify({ error: "Invite not found or has expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (invite.status === "completed") {
      // Don't count this as a failed attempt - token is valid but already used
      return new Response(JSON.stringify({ error: "This invite has already been used" }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const email = `driver-${normalizePhone(invite.phone)}@audio-salvage.driver`;

    // Create user (or reset password if it already exists)
    // We prefer to check existence first to avoid relying on provider-specific error messages.
    let userId: string | null = await findUserIdByEmail(supabaseAdmin, email);

    if (userId) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
      } as any);
      if (updateError) throw updateError;
    } else {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone: invite.phone },
      });
      if (createError) throw createError;
      userId = createData.user?.id ?? null;
    }

    if (!userId) throw new Error("Failed to provision driver account");

    // Ensure profile exists / is updated
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email,
        contact_name: invite.contact_name,
        phone: invite.phone,
        role: "driver",
        business_name: "Driver",
        address_line1: "N/A",
        city: "N/A",
        postcode: "N/A",
        coverage_areas: invite.coverage_areas || [],
      },
      { onConflict: "id" },
    );
    if (profileError) throw profileError;

    // Mark invite complete
    const { error: completeError } = await supabaseAdmin
      .from("driver_invites")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        profile_id: userId,
      })
      .eq("id", invite.id);
    if (completeError) throw completeError;

    // Record successful attempt (clears rate limit concerns for this IP)
    await recordAttempt(supabaseAdmin, clientIp, endpoint, true);
    
    console.log(`Driver setup successful for IP: ${clientIp}, user: ${userId}`);

    return new Response(JSON.stringify({ email, user_id: userId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error(`Driver setup error for IP ${clientIp}:`, error?.message);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

// Helper function to record rate limit attempts
async function recordAttempt(
  supabaseAdmin: any,
  ipAddress: string,
  endpoint: string,
  success: boolean
): Promise<void> {
  try {
    await supabaseAdmin.rpc("record_rate_limit_attempt", {
      _ip_address: ipAddress,
      _endpoint: endpoint,
      _success: success,
    });
  } catch (error) {
    console.error("Failed to record rate limit attempt:", error);
    // Don't throw - rate limiting is secondary to main functionality
  }
}
