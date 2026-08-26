// Envio de email via Resend, só com fetch — mesma escolha feita na
// integração do Google Calendar: sem SDK pesado no bundle.
//
// Config (Vercel → Environment Variables):
//   RESEND_API_KEY   chave da conta Resend
//   EMAIL_FROM       remetente, ex: "Nova Era AI CRM <crm@novaeraai.com.br>"
//                    (o domínio precisa estar verificado na Resend)
//
// Sem RESEND_API_KEY o envio vira no-op registrado no log: a automação
// desliga sozinha em vez de quebrar o fluxo que a chamou.

const RESEND_API = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; error: string };

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY não configurada — envio ignorado:", input.subject);
    return { ok: false, skipped: true, reason: "RESEND_API_KEY não configurada" };
  }

  const from = process.env.EMAIL_FROM ?? "Nova Era AI CRM <onboarding@resend.dev>";

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      const error = body.message ?? `HTTP ${res.status}`;
      console.error("[email] falha no envio:", error);
      return { ok: false, error };
    }
    return { ok: true, id: body.id ?? "" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[email] erro de rede no envio:", error);
    return { ok: false, error };
  }
}
