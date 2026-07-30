import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncConnection } from "@/lib/google/sync";
import type { Database } from "@/types/database";

type Connection = Database["public"]["Tables"]["google_calendar_connections"]["Row"];

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: connectionRaw, error } = await admin
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!connectionRaw) return NextResponse.json({ error: "not_connected" }, { status: 404 });
  const connection = connectionRaw as unknown as Connection;
  if (!connection.sync_enabled) return NextResponse.json({ error: "sync_disabled" }, { status: 400 });

  try {
    const result = await syncConnection(admin, connection);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[calendar sync] erro:", err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
