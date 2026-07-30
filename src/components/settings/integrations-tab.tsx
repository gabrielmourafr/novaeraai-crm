"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Calendar, CheckCircle2, RefreshCw, Unlink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/lib/utils/format";
import {
  useGoogleCalendarConnection,
  useSyncGoogleCalendar,
  useDisconnectGoogleCalendar,
  useUpdateGoogleSyncEnabled,
} from "@/lib/hooks/use-google-calendar";

const ERROR_MESSAGES: Record<string, string> = {
  no_refresh_token: "O Google não retornou permissão de acesso contínuo. Tente conectar de novo.",
  exchange_failed: "Falha ao trocar o código de autorização com o Google.",
  missing_code: "Autorização cancelada ou incompleta.",
  invalid_state: "Sessão de autorização inválida. Tente novamente.",
  user_mismatch: "Conflito de usuário na autorização. Tente novamente.",
  profile_not_found: "Perfil de usuário não encontrado.",
};

export function IntegrationsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: connection, isLoading } = useGoogleCalendarConnection();
  const sync = useSyncGoogleCalendar();
  const disconnect = useDisconnectGoogleCalendar();
  const updateEnabled = useUpdateGoogleSyncEnabled();

  useEffect(() => {
    const status = searchParams.get("google_calendar");
    if (!status) return;
    if (status === "success") {
      toast.success("Google Calendar conectado com sucesso!");
    } else if (status === "error") {
      const message = searchParams.get("message") ?? "";
      toast.error(ERROR_MESSAGES[message] ?? "Erro ao conectar com o Google Calendar.");
    }
    router.replace("/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg" style={{ background: "rgba(11,135,195,0.1)" }}>
              <Calendar size={20} style={{ color: "#0B87C3" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Google Calendar</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Sincronize a Agenda do CRM com o seu Google Calendar (duas vias)
              </p>
            </div>
          </div>

          {!isLoading && !connection && (
            <Button size="sm" style={{ background: "var(--primary)" }} onClick={() => (window.location.href = "/api/auth/google/connect")}>
              <Link2 size={14} className="mr-1.5" />
              Conectar
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-text-muted mt-4">Carregando...</p>
        ) : connection ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span className="text-text-primary font-medium">Conectado</span>
              {connection.google_email && (
                <span className="text-text-muted">— {connection.google_email}</span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm text-text-primary">Sincronização automática</p>
                <p className="text-xs text-text-muted">
                  {connection.last_synced_at
                    ? `Última sincronização: ${formatDateTime(connection.last_synced_at)}`
                    : "Ainda não sincronizado"}
                </p>
              </div>
              <Switch
                checked={connection.sync_enabled}
                onCheckedChange={(checked) => updateEnabled.mutate({ id: connection.id, enabled: checked })}
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => sync.mutate()}
                disabled={sync.isPending || !connection.sync_enabled}
              >
                <RefreshCw size={13} className={`mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} />
                Sincronizar agora
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-danger hover:text-danger"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unlink size={13} className="mr-1.5" />
                Desconectar
              </Button>
            </div>

            <p className="text-[11px] text-text-muted">
              Eventos criados na Agenda (aba Comercial) são enviados pro seu Google Calendar, e eventos criados
              no Google Calendar aparecem na Agenda do CRM. A sincronização roda quando você clica em
              &quot;Sincronizar agora&quot; ou automaticamente ao criar/editar/excluir um evento.
            </p>
          </div>
        ) : (
          <p className="text-xs text-text-muted mt-4">
            Nenhuma conta conectada. Clique em &quot;Conectar&quot; pra vincular seu Google Calendar.
          </p>
        )}
      </div>
    </div>
  );
}
