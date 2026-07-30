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

  const refreshed = await refreshAccessToken(connection.refresh_token);
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

function googleEventToCrmFields(gEvent: GoogleEvent, orgId: string, userId: string) {
  const startIso = gEvent.start?.dateTime ?? (gEvent.start?.date ? `${gEvent.start.date}T00:00:00` : null);
  const endIso = gEvent.end?.dateTime ?? (gEvent.end?.date ? `${gEvent.end.date}T00:00:00` : null);
  const durationMin =
    startIso && endIso ? Math.max(15, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)) : 60;

  return {
    org_id: orgId,
    title: gEvent.summary || "(Sem título)",
    type: "outro" as const,
    start_at: startIso ?? new Date().toISOString(),
    duration_min: durationMin,
    agenda: gEvent.description ?? null,
    meeting_url: gEvent.hangoutLink ?? gEvent.location ?? null,
    created_by: userId,
    google_event_id: gEvent.id,
    google_synced_at: new Date().toISOString(),
    sync_source: "google" as const,
    participant_ids: [],
    lead_id: null,
    project_id: null,
    contact_id: null,
    result: null,
  };
}

// Envia pro Google os eventos criados no CRM que ainda não foram sincronizados
// ou que mudaram desde a última sincronização.
export async function pushCrmEventsToGoogle(admin: AdminClient, connection: Connection) {
  const accessToken = await getValidAccessToken(admin, connection);

  const { data: pending, error } = await admin
    .from("events")
    .select("*")
    .eq("created_by", connection.user_id)
    .eq("sync_source", "crm")
    .or(`google_synced_at.is.null,updated_at.gt.google_synced_at`);
  if (error) throw error;

  let pushed = 0;
  for (const event of (pending ?? []) as unknown as CrmEvent[]) {
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
export async function pullGoogleEventsToCrm(admin: AdminClient, connection: Connection) {
  const accessToken = await getValidAccessToken(admin, connection);

  let result;
  try {
    result = await listGoogleEvents(accessToken, connection.calendar_id, {
      syncToken: connection.sync_token ?? undefined,
      timeMin: connection.sync_token ? undefined : new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "SyncTokenInvalidError") {
      // Token de sincronização expirou — refaz do zero a partir de agora
      result = await listGoogleEvents(accessToken, connection.calendar_id, { timeMin: new Date().toISOString() });
    } else {
      throw err;
    }
  }

  let pulled = 0;
  for (const gEvent of result.events) {
    if (gEvent.status === "cancelled") {
      await admin.from("events").delete().eq("google_event_id", gEvent.id).eq("created_by", connection.user_id);
      continue;
    }

    const { data: existing } = await admin
      .from("events")
      .select("id")
      .eq("google_event_id", gEvent.id)
      .eq("created_by", connection.user_id)
      .maybeSingle();

    const fields = googleEventToCrmFields(gEvent, connection.org_id, connection.user_id);

    if (existing) {
      await admin.from("events").update(fields).eq("id", existing.id);
    } else {
      await admin.from("events").insert(fields);
    }
    pulled++;
  }

  await admin
    .from("google_calendar_connections")
    .update({ sync_token: result.nextSyncToken ?? connection.sync_token, last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return pulled;
}

export async function syncConnection(admin: AdminClient, connection: Connection) {
  const pushed = await pushCrmEventsToGoogle(admin, connection);
  const pulled = await pullGoogleEventsToCrm(admin, connection);
  return { pushed, pulled };
}
