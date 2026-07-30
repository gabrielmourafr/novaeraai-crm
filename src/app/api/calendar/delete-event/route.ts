import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCrmEventFromGoogle } from "@/lib/google/sync";

// Apaga o evento no CRM e, se estiver vinculado a um evento do Google Calendar
// do usuário, apaga lá também.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id, google_event_id, created_by").eq("id", id).maybeSingle();

  if (event?.google_event_id && event.created_by) {
    try {
      await deleteCrmEventFromGoogle(admin, event.created_by, event.google_event_id);
    } catch (err) {
      console.error("[delete-event] falha ao apagar no Google (seguindo com a exclusão local):", err);
    }
  }

  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
