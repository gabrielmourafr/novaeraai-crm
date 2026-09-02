import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncConnection } from "@/lib/google/sync";
import type { Database } from "@/types/database";

type Connection = Database["public"]["Tables"]["google_calendar_connections"]["Row"];

// Sincroniza a agenda de TODA a organização, não só a de quem está logado.
//
// Sem isso, a ocupação de uma pessoa só era atualizada quando ela mesma
// abria o CRM — e a disponibilidade dela aparecia vazia pra quem estivesse
// tentando marcar reunião. Era o pior erro possível nessa tela: mostrar
// livre um horário que não está.
//
// Cada conexão tem sua própria credencial guardada, então o servidor
// consegue puxar sem a sessão da pessoa.

// Não repuxa quem sincronizou há pouco — a tela chama isso a cada abertura.
const STALE_AFTER_MS = 5 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: me } = await admin.from("users").select("org_id").eq("id", user.id).maybeSingle();
  if (!me?.org_id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: connectionsRaw, error } = await admin
    .from("google_calendar_connections")
    .select("*")
    .eq("org_id", me.org_id)
    .eq("sync_enabled", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const connections = (connectionsRaw ?? []) as unknown as Connection[];
  const now = Date.now();
  const results: { userId: string; ok: boolean; error?: string; skipped?: boolean }[] = [];

  for (const connection of connections) {
    const lastSynced = connection.last_synced_at ? new Date(connection.last_synced_at).getTime() : 0;
    if (now - lastSynced < STALE_AFTER_MS) {
      results.push({ userId: connection.user_id, ok: true, skipped: true });
      continue;
    }
    try {
      await syncConnection(admin, connection);
      results.push({ userId: connection.user_id, ok: true });
    } catch (err) {
      // Uma conexão quebrada (token revogado, por exemplo) não pode derrubar
      // a sincronização das outras. O erro já foi gravado em sync_error.
      results.push({
        userId: connection.user_id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
