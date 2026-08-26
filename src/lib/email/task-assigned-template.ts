// Corpo do email disparado quando uma tarefa é atribuída a alguém.
// HTML inline (sem <style> nem classes) porque cliente de email —
// Gmail incluído — descarta boa parte do CSS externo.

export interface TaskEmailData {
  title: string;
  notes: string | null;
  type: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string;
  createdByName: string | null;
  companyName: string | null;
  projectName: string | null;
  leadTitle: string | null;
  taskUrl: string;
}

const TYPE_LABELS: Record<string, string> = {
  followup: "Follow-up",
  ligacao: "Ligação",
  email: "Email",
  reuniao: "Reunião",
  proposta: "Proposta",
  entrega: "Entrega",
  interno: "Interno",
  outro: "Outro",
};

const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "#64748b",
  media: "#0ea5e9",
  alta: "#f59e0b",
  urgente: "#ef4444",
};

function formatDueDate(iso: string | null) {
  if (!iso) return "Sem prazo definido";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTaskAssignedSubject(data: TaskEmailData) {
  const prefix = data.priority === "urgente" ? "[URGENTE] " : "";
  return `${prefix}Nova tarefa: ${data.title}`;
}

export function buildTaskAssignedEmail(data: TaskEmailData) {
  const priorityColor = PRIORITY_COLORS[data.priority] ?? "#64748b";
  const priorityLabel = PRIORITY_LABELS[data.priority] ?? data.priority;
  const typeLabel = TYPE_LABELS[data.type] ?? data.type;

  // Só entram as linhas que existem — tarefa sem projeto não mostra
  // "Projeto: —", que só polui.
  const rows: Array<[string, string]> = [
    ["Prazo", formatDueDate(data.dueDate)],
    ["Prioridade", priorityLabel],
    ["Tipo", typeLabel],
  ];
  if (data.companyName) rows.push(["Cliente", data.companyName]);
  if (data.projectName) rows.push(["Projeto", data.projectName]);
  if (data.leadTitle) rows.push(["Lead", data.leadTitle]);
  if (data.createdByName) rows.push(["Criada por", data.createdByName]);

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:14px;width:130px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  const notesHtml = data.notes
    ? `
      <div style="margin-top:24px;padding:16px;background:#f8fafc;border-left:3px solid #e2e8f0;border-radius:4px;">
        <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Descrição</div>
        <div style="color:#334155;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.notes)}</div>
      </div>`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:28px 28px 0 28px;">
          <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${priorityColor};color:#ffffff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
            ${escapeHtml(priorityLabel)}
          </div>
          <h1 style="margin:14px 0 4px 0;color:#0f172a;font-size:20px;line-height:1.35;font-weight:600;">
            ${escapeHtml(data.title)}
          </h1>
          <p style="margin:0;color:#64748b;font-size:14px;">
            ${escapeHtml(data.assigneeName)}, essa tarefa foi atribuída a você no CRM.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 0 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e2e8f0;">
            ${rowsHtml}
          </table>
          ${notesHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px 28px 28px;">
          <a href="${data.taskUrl}" style="display:inline-block;padding:11px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
            Abrir no CRM
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px 28px;border-top:1px solid #e2e8f0;">
          <p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;">
            Email automático do Nova Era AI CRM.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Nova tarefa atribuída a você: ${data.title}`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ...(data.notes ? ["", "Descrição:", data.notes] : []),
    "",
    `Abrir no CRM: ${data.taskUrl}`,
  ].join("\n");

  return { html, text };
}
