import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Quem da organização tem agenda conectada e sincronizando.
//
// Precisa passar pelo servidor: a policy de RLS de
// google_calendar_connections é "user_id = auth.uid()", ou seja, cada
// pessoa só enxerga a própria conexão. Consultado direto do cliente, todo
// colega parecia desconectado — e a tela de disponibilidade acusava gente
// que estava conectada.
//
// Não dá pra afrouxar a RLS: a tabela guarda access_token e refresh_token.
// Por isso a leitura ampla acontece aqui, devolvendo só o que é seguro.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: me } = await admin.from("users").select("org_id").eq("id", user.id).maybeSingle();
  if (!me?.org_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await admin
    .from("google_calendar_connections")
    .select("user_id, last_synced_at, sync_error, sync_enabled")
    .eq("org_id", me.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    coverage: (data ?? []).map((c) => ({
      userId: c.user_id,
      connected: Boolean(c.sync_enabled),
      lastSyncedAt: c.last_synced_at,
      syncError: c.sync_error,
    })),
  });
}
