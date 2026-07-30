import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthUrl } from "@/lib/google/calendar";

// Inicia o fluxo OAuth: redireciona pro consentimento do Google.
// O "state" carrega o user_id + um nonce simples pra validar no callback.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "https://novaeraai-crm.vercel.app"));
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString("base64url");
  const url = getGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
