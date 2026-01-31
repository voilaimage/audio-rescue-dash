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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Server not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { invite_token, password }: DriverSetupRequest = await req.json();
    if (!invite_token) throw new Error("Missing invite_token");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("driver_invites")
      .select("id, contact_name, phone, status, coverage_areas")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invite not found or has expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (invite.status === "completed") {
      return new Response(JSON.stringify({ error: "This invite has already been used" }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const email = `driver-${normalizePhone(invite.phone)}@audio-salvage.driver`;

    // Create user (or reset password if it already exists)
    let userId: string | null = null;
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: invite.phone },
    });

    if (createError) {
      const msg = (createError as any).message?.toLowerCase?.() ?? String(createError);
      if (msg.includes("already") && msg.includes("registered")) {
        userId = await findUserIdByEmail(supabaseAdmin, email);
        if (!userId) throw new Error("Account exists but could not be located");

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        } as any);
        if (updateError) throw updateError;
      } else {
        throw createError;
      }
    } else {
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

    return new Response(JSON.stringify({ email, user_id: userId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
