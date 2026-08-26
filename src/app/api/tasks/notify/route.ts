import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { buildTaskAssignedEmail, buildTaskAssignedSubject } from "@/lib/email/task-assigned-template";

// Dispara o email de "nova tarefa" pro responsável.
// Chamada pelo front logo depois de criar a tarefa — nunca bloqueia a
// criação: qualquer falha aqui volta como 200 com ok:false e o CRM segue.

interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  type: string;
  priority: string;
  due_date: string | null;
  org_id: string;
  assignee_id: string | null;
  created_by: string | null;
  company: { name: string } | null;
  project: { name: string } | null;
  lead: { title: string } | null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { taskId } = (await req.json().catch(() => ({}))) as { taskId?: string };
  if (!taskId) return NextResponse.json({ error: "taskId obrigatório" }, { status: 400 });

  const admin = createAdminClient();

  const { data: taskRaw, error: taskError } = await admin
    .from("tasks")
    .select(
      `id, title, notes, type, priority, due_date, org_id, assignee_id, created_by,
       company:companies(name), project:projects(name), lead:leads(title)`
    )
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) return NextResponse.json({ ok: false, error: taskError.message }, { status: 500 });
  if (!taskRaw) return NextResponse.json({ ok: false, error: "tarefa não encontrada" }, { status: 404 });

  const task = taskRaw as unknown as TaskRow;

  // Quem chamou precisa ser da mesma org da tarefa.
  const { data: caller } = await admin
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!caller || caller.org_id !== task.org_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!task.assignee_id) {
    return NextResponse.json({ ok: false, skipped: "tarefa sem responsável" });
  }
  // Criar tarefa pra si mesmo não gera email — a pessoa acabou de escrevê-la.
  if (task.assignee_id === user.id) {
    return NextResponse.json({ ok: false, skipped: "responsável é quem criou" });
  }

  const { data: assignee } = await admin
    .from("users")
    .select("full_name, email, notification_email")
    .eq("id", task.assignee_id)
    .maybeSingle();

  if (!assignee) return NextResponse.json({ ok: false, skipped: "responsável não encontrado" });

  // notification_email é o corporativo; email é o login. Prefere o primeiro.
  const to = (assignee.notification_email as string | null) ?? assignee.email;
  if (!to) return NextResponse.json({ ok: false, skipped: "responsável sem email" });

  const { data: creator } = task.created_by
    ? await admin.from("users").select("full_name, email").eq("id", task.created_by).maybeSingle()
    : { data: null };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://novaeraai-crm.vercel.app";

  const emailData = {
    title: task.title,
    notes: task.notes,
    type: task.type,
    priority: task.priority,
    dueDate: task.due_date,
    assigneeName: (assignee.full_name as string | null) ?? "Olá",
    createdByName: (creator?.full_name as string | null) ?? null,
    companyName: task.company?.name ?? null,
    projectName: task.project?.name ?? null,
    leadTitle: task.lead?.title ?? null,
    taskUrl: `${appUrl}/tasks`,
  };

  const { html, text } = buildTaskAssignedEmail(emailData);
  const result = await sendEmail({
    to,
    subject: buildTaskAssignedSubject(emailData),
    html,
    text,
    // Responder o email cai direto pra quem criou a tarefa.
    replyTo: (creator?.email as string | null) ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json(result);
  }
  return NextResponse.json({ ok: true, to, id: result.id });
}
