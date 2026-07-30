import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/google/calendar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://novaeraai-crm.vercel.app";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const redirectTo = (status: "success" | "error", message?: string) => {
    const url = new URL("/settings", APP_URL);
    url.searchParams.set("google_calendar", status);
    if (message) url.searchParams.set("message", message);
    return NextResponse.redirect(url);
  };

  if (errorParam) return redirectTo("error", errorParam);
  if (!code || !stateRaw) return redirectTo("error", "missing_code");

  let userId: string;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    userId = state.userId;
  } catch {
    return redirectTo("error", "invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return redirectTo("error", "user_mismatch");

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Sem refresh_token normalmente significa que o usuário já autorizou antes
      // sem revogar — orientamos a tentar de novo (o prompt=consent deveria evitar isso)
      return redirectTo("error", "no_refresh_token");
    }

    const email = await getGoogleUserEmail(tokens.access_token);

    const { data: profile } = await supabase.from("users").select("org_id").eq("id", user.id).single();
    if (!profile) return redirectTo("error", "profile_not_found");

    const admin = createAdminClient();
    const { error } = await admin.from("google_calendar_connections").upsert(
      {
        org_id: profile.org_id,
        user_id: user.id,
        google_email: email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        calendar_id: "primary",
        sync_enabled: true,
        sync_token: null,
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;

    return redirectTo("success");
  } catch (err) {
    console.error("[google callback] erro:", err);
    return redirectTo("error", "exchange_failed");
  }
}
