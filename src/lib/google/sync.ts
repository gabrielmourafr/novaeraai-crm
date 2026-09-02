import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  refreshAccessToken,
  listGoogleEvents,
  insertGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  type GoogleEvent,
} from "./calendar";

type Connection = Database["public"]["Tables"]["google_calendar_connections"]["Row"];
type CrmEvent = Database["public"]["Tables"]["events"]["Row"];
type AdminClient = SupabaseClient<Database>;

// Garante um access_token válido, renovando com o refresh_token se necessário
export async function getValidAccessToken(admin: AdminClient, connection: Connection): Promise<string> {
  const expiresInMs = new Date(connection.token_expiry).getTime() - Date.now();
  if (expiresInMs > 60_000) return connection.access_token;

  let refreshed;
  try {
    refreshed = await refreshAccessToken(connection.refresh_token);
  } catch (err) {
    // O refresh_token do Google morre em 7 dias enquanto o app OAuth está
    // em "Testing", e a partir daí toda sincronização falha calada. Registra
    // pra tela de Integrações poder pedir a reconexão.
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("google_calendar_connections")
      .update({ sync_error: `Token expirado ou revogado: ${message}`, sync_error_at: new Date().toISOString() })
      .eq("id", connection.id);
    throw err;
  }

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("google_calendar_connections")
    .update({ access_token: refreshed.access_token, token_expiry: newExpiry })
    .eq("id", connection.id);

  return refreshed.access_token;
}

function crmEventToGoogleBody(event: CrmEvent) {
  const start = new Date(event.start_at);
  const end = new Date(start.getTime() + (event.duration_min ?? 60) * 60000);
  return {
    summary: event.title,
    description: [event.agenda, event.result ? `\nResultado: ${event.result}` : ""].filter(Boolean).join("\n") || undefined,
    location: event.meeting_url ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

export async function pushCrmEventsToGoogle(admin: AdminClient, connection: Connection) {
  const accessToken = await getValidAccessToken(admin, connection);

  // ATENÇÃO: não dá pra comparar duas COLUNAS num filtro do PostgREST — o
  // lado direito é sempre tratado como literal. O filtro que existia aqui,
  // `updated_at.gt.google_synced_at`, devolvia HTTP 400 ("invalid input
  // syntax for type timestamp with time zone") em toda chamada, então esta
  // função lançava sempre e nenhum evento jamais foi enviado ao Google.
  // A comparação é feita em JS — o volume é de dezenas de linhas.
  const { data: candidates, error } = await admin
    .from("events")
    .select("*")
    .eq("created_by", connection.user_id)
    .eq("sync_source", "crm");
  if (error) throw error;

  // Tolerância de 5s: gravar o carimbo dispara o trigger de updated_at, que
  // ficaria alguns milissegundos à frente e reenviaria o mesmo evento em toda
  // sincronização, pra sempre.
  const RESYNC_TOLERANCE_MS = 5000;
  const pending = ((candidates ?? []) as unknown as CrmEvent[]).filter(
    (e) =>
      !e.google_synced_at ||
      new Date(e.updated_at).getTime() > new Date(e.google_synced_at).getTime() + RESYNC_TOLERANCE_MS
  );

  let pushed = 0;
  for (const event of pending) {
    const body = crmEventToGoogleBody(event);
    let googleEvent: GoogleEvent;
    if (event.google_event_id) {
      googleEvent = await updateGoogleEvent(accessToken, connection.calendar_id, event.google_event_id, body);
    } else {
      googleEvent = await insertGoogleEvent(accessToken, connection.calendar_id, body);
    }
    await admin
      .from("events")
      .update({ google_event_id: googleEvent.id, google_synced_at: new Date().toISOString() })
      .eq("id", event.id);
    pushed++;
  }
  return pushed;
}

// Remove do Google eventos que foram apagados no CRM (chamar antes de deletar,
// ou passar o google_event_id direto)
export async function deleteCrmEventFromGoogle(admin: AdminClient, userId: string, googleEventId: string) {
  const { data: connectionRaw } = await admin
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("sync_enabled", true)
    .maybeSingle();
  if (!connectionRaw) return;
  const connection = connectionRaw as unknown as Connection;
  const accessToken = await getValidAccessToken(admin, connection);
  await deleteGoogleEvent(accessToken, connection.calendar_id, googleEventId);
}

// Traz do Google os eventos novos/alterados e cria/atualiza no CRM
// Janela de ocupação que interessa pra agenda: de agora até 120 dias.
// Sem limite, recorrências do Google chegavam expandidas até 2056.
const BUSY_WINDOW_DAYS = 120;

// Traz a agenda do Google como BLOCOS DE OCUPAÇÃO, numa tabela própria.
//
// Nunca grava em `events`: agenda pessoal não é evento do CRM. Antes tudo
// caía em events, o que (a) enchia a agenda comercial de compromisso
// pessoal, com título visível pra organização inteira, e (b) sobrescrevia
// o evento do CRM que tinha acabado de ser enviado, apagando tipo,
// participantes e vínculos.
export async function pullGoogleBusyBlocks(admin: AdminClient, connection: Connection) {
  const accessToken = await getValidAccessToken(admin, connection);

  const timeMin = new Date();
  const timeMax = new Date(Date.now() + BUSY_WINDOW_DAYS * 86400000);

  const result = await listGoogleEvents(accessToken, connection.calendar_id, {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  });

  // Eventos que nós mesmos enviamos já estão em `events` e seriam contados
  // duas vezes na disponibilidade.
  const { data: ourEvents } = await admin
    .from("events")
    .select("google_event_id")
    .eq("created_by", connection.user_id)
    .not("google_event_id", "is", null);
  const ours = new Set((ourEvents ?? []).map((e) => e.google_event_id as string));

  const rows: {
    org_id: string; user_id: string; google_event_id: string; title: string | null;
    start_at: string; end_at: string; is_all_day: boolean; synced_at: string;
  }[] = [];
  const cancelled: string[] = [];

  for (const gEvent of result.events) {
    if (gEvent.status === "cancelled") {
      cancelled.push(gEvent.id);
      continue;
    }
    if (ours.has(gEvent.id)) continue;
    // Recusado por quem sincronizou não ocupa a agenda dele.
    const me = gEvent.attendees?.find((a) => a.self);
    if (me?.responseStatus === "declined") continue;
    // "Livre" no Google (transparent) também não ocupa.
    if (gEvent.transparency === "transparent") continue;

    const isAllDay = !gEvent.start?.dateTime && Boolean(gEvent.start?.date);
    const startIso = gEvent.start?.dateTime ?? (gEvent.start?.date ? `${gEvent.start.date}T00:00:00` : null);
    const endIso = gEvent.end?.dateTime ?? (gEvent.end?.date ? `${gEvent.end.date}T00:00:00` : null);
    if (!startIso) continue;

    rows.push({
      org_id: connection.org_id,
      user_id: connection.user_id,
      google_event_id: gEvent.id,
      title: gEvent.summary ?? null,
      start_at: new Date(startIso).toISOString(),
      end_at: new Date(endIso ?? new Date(new Date(startIso).getTime() + 3600000)).toISOString(),
      is_all_day: isAllDay,
      synced_at: new Date().toISOString(),
    });
  }

  // Substitui a janela inteira: o que sumiu do Google some daqui também,
  // sem depender de receber o "cancelled" de cada um.
  await admin
    .from("external_busy_blocks")
    .delete()
    .eq("user_id", connection.user_id)
    .gte("start_at", timeMin.toISOString())
    .lte("start_at", timeMax.toISOString());

  if (rows.length > 0) {
    await admin.from("external_busy_blocks").upsert(rows, { onConflict: "user_id,google_event_id" });
  }
  if (cancelled.length > 0) {
    await admin
      .from("external_busy_blocks")
      .delete()
      .eq("user_id", connection.user_id)
      .in("google_event_id", cancelled);
  }

  await admin
    .from("google_calendar_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return rows.length;
}

export async function syncConnection(admin: AdminClient, connection: Connection) {
  const pushed = await pushCrmEventsToGoogle(admin, connection);
  const pulled = await pullGoogleBusyBlocks(admin, connection);
  // Deu certo: limpa o erro anterior e carimba a hora.
  await admin
    .from("google_calendar_connections")
    .update({ sync_error: null, sync_error_at: null, last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);
  return { pushed, pulled };
}
