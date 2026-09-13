// @ts-nocheck
// Supabase Edge Function (Deno Runtime)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing server environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verifikasi peran Super Admin dari header Authorization
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await adminClient.auth.getUser(token);
      if (!user) {
        return new Response(
          JSON.stringify({ error: "Sesi pengguna tidak valid" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const callerRole = user.user_metadata?.role;
      if (callerRole !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Hanya Super Admin yang berhak mendaftarkan akun baru" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { username, fullName, role, password } = await req.json();

    if (!username || !fullName || !password) {
      return new Response(
        JSON.stringify({ error: "Data pendaftaran pengguna belum lengkap (username, nama lengkap, dan kata sandi wajib diisi)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase().replace(/@.*$/, "");
    if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
      return new Response(
        JSON.stringify({ error: "Username hanya boleh huruf kecil, angka, titik, strip, atau underscore (3-30 karakter)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = `${cleanUsername}@podqes.web.id`;
    let userRole = "user";
    if (role === "super_admin") userRole = "super_admin";
    else if (role === "admin") userRole = "admin";

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: userRole,
        username: cleanUsername,
      },
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profil di tabel profiles
    try {
      await adminClient.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: userRole,
      });
    } catch {
      try {
        const fallbackRole = userRole === "user" ? "petugas" : "admin";
        await adminClient.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          role: fallbackRole,
        });
      } catch {
        // Ditangani oleh trigger database
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email,
          username: cleanUsername,
          full_name: fullName,
          role: userRole,
          created_at: data.user.created_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
