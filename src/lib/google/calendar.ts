// Integração com a API do Google Calendar (OAuth2 + REST v3), sem SDK —
// só fetch, pra não adicionar a dependência pesada `googleapis`.

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function getRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "https://novaeraai-crm.vercel.app"}/api/auth/google/callback`
  );
}

export function getGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // garante que sempre retorna refresh_token
    state,
  });
  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json();
}

export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

// ─── Calendar events ──────────────────────────────────────────────────────

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  hangoutLink?: string;
  location?: string;
  status?: string; // "confirmed" | "cancelled" | "tentative"
  updated?: string;
  // "transparent" = marcado como Livre no Google, não ocupa a agenda
  transparency?: string;
  attendees?: { self?: boolean; responseStatus?: string; email?: string }[];
}

export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  opts: { syncToken?: string; timeMin?: string; timeMax?: string } = {}
): Promise<{ events: GoogleEvent[]; nextSyncToken?: string }> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: "250", singleEvents: "true" });
    if (opts.syncToken) {
      params.set("syncToken", opts.syncToken);
    } else {
      if (opts.timeMin) params.set("timeMin", opts.timeMin);
      if (opts.timeMax) params.set("timeMax", opts.timeMax);
    }
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      // syncToken expirado/inválido — quem chamou deve refazer sync completo (sem syncToken)
      if (res.status === 410) {
        const err = new Error("SYNC_TOKEN_INVALID");
        err.name = "SyncTokenInvalidError";
        throw err;
      }
      throw new Error(`Google Calendar list events failed: ${await res.text()}`);
    }
    const data = await res.json();
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken ?? nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken };
}

export async function insertGoogleEvent(accessToken: string, calendarId: string, body: object): Promise<GoogleEvent> {
  const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar insert event failed: ${await res.text()}`);
  return res.json();
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  body: object
): Promise<GoogleEvent> {
  const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google Calendar update event failed: ${await res.text()}`);
  return res.json();
}

export async function deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 410/404 = já não existe lá, tudo bem
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google Calendar delete event failed: ${await res.text()}`);
  }
}
