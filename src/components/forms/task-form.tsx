"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TASK_PRIORITIES, TASK_TYPES, TASK_TYPES_CURRENT, TASK_COMPLEXITIES, MAINTENANCE_TASK_TYPES, isLegacyTaskType } from "@/lib/utils/constants";
import { toast } from "sonner";
import { useCreateTask, useUpdateTask } from "@/lib/hooks/use-tasks";
import { useUser, useOrgUsers } from "@/lib/hooks/use-user";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useProjects } from "@/lib/hooks/use-projects";
import { formatDurationBetween, formatDate } from "@/lib/utils/format";
import type { Database } from "@/types/database";

type TaskPriority = Database["public"]["Tables"]["tasks"]["Row"]["priority"];
type TaskStatus = Database["public"]["Tables"]["tasks"]["Row"]["status"];
type TaskType = Database["public"]["Tables"]["tasks"]["Row"]["type"];
type TaskComplexity = Database["public"]["Tables"]["tasks"]["Row"]["complexity"];

const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const taskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  due_date: z.string().optional(),
  priority: z.string().min(1, "Prioridade é obrigatória"),
  status: z.string().optional(),
  notes: z.string().optional(),
  assignee_id: z.string().optional(),
  complexity: z.string().optional(),
  estimated_hours: z.string().optional(),
  company_id: z.string().optional(),
  task_project_id: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export interface TaskInitialData {
  id: string;
  title: string;
  type: string;
  due_date: string | null;
  priority: string;
  status: string;
  notes: string | null;
  lead_id?: string | null;
  project_id?: string | null;
  phase_id?: string | null;
  assignee_id?: string | null;
  complexity?: string | null;
  estimated_hours?: number | null;
  company_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  leadId?: string;
  projectId?: string;
  phaseId?: string;
  onSuccess?: () => void;
  initialData?: TaskInitialData;
}

export const TaskForm = ({
  open,
  onClose,
  leadId,
  projectId,
  phaseId,
  onSuccess,
  initialData,
}: TaskFormProps) => {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { user } = useUser();
  const { data: orgUsers = [] } = useOrgUsers();
  const { data: companies = [] } = useCompanies();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      priority: "media",
      // Sem tipo pré-selecionado de propósito: antes vinha "followup" (que
      // nem é mais um tipo válido pra tarefa nova) e todo mundo salvava
      // sem perceber, arruinando a análise de tempo por tipo.
      type: "",
      status: "pendente",
    },
  });

  const typeValue = watch("type");
  const priorityValue = watch("priority");
  const statusValue = watch("status");
  const assigneeValue = watch("assignee_id");
  const complexityValue = watch("complexity");
  const companyIdValue = watch("company_id");
  const taskProjectIdValue = watch("task_project_id");
  const isMaintenanceType = MAINTENANCE_TASK_TYPES.has(typeValue ?? "");

  // Na criação só os tipos atuais. Na edição, some o legado — menos o tipo
  // que a própria tarefa já tem, senão o select abriria vazio.
  const typeOptions = useMemo(() => {
    if (!isEditing) return TASK_TYPES_CURRENT.slice();
    const current: { value: string; label: string }[] = TASK_TYPES_CURRENT.slice();
    if (typeValue && isLegacyTaskType(typeValue)) {
      const legacy = TASK_TYPES.find((t) => t.value === typeValue);
      if (legacy) current.push({ value: legacy.value, label: `${legacy.label} (legado)` });
    }
    return current;
  }, [isEditing, typeValue]);

  const { data: companyProjects = [] } = useProjects(
    companyIdValue && companyIdValue !== "__none__" ? { companyId: companyIdValue } : undefined
  );

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          title: initialData.title,
          type: initialData.type,
          due_date: initialData.due_date
            ? initialData.due_date.split("T")[0]
            : "",
          priority: initialData.priority,
          status: initialData.status,
          notes: initialData.notes ?? "",
          assignee_id: initialData.assignee_id ?? "",
          complexity: initialData.complexity ?? "",
          estimated_hours: initialData.estimated_hours?.toString() ?? "",
          company_id: initialData.company_id ?? "",
          task_project_id: initialData.project_id ?? "",
        });
      } else {
        reset({
          title: "",
          type: "",
          due_date: "",
          priority: "media",
          status: "pendente",
          notes: "",
          assignee_id: user?.id ?? "",
          complexity: "",
          estimated_hours: "",
          company_id: "",
          task_project_id: "",
        });
      }
    }
  }, [open, initialData, reset, user]);

  const onSubmit = async (values: TaskFormValues) => {
    const complexity = values.complexity && values.complexity !== "__none__" ? (values.complexity as TaskComplexity) : null;
    const estimatedHours = values.estimated_hours ? parseFloat(values.estimated_hours.replace(",", ".")) : null;
    const companyId = values.company_id && values.company_id !== "__none__" ? values.company_id : null;
    const maintenanceProjectId = values.task_project_id && values.task_project_id !== "__none__" ? values.task_project_id : null;

    if (isEditing && initialData) {
      await updateTask.mutateAsync({
        id: initialData.id,
        title: values.title,
        type: values.type as TaskType,
        due_date: values.due_date || null,
        priority: values.priority as TaskPriority,
        status: values.status as TaskStatus,
        notes: values.notes || null,
        complexity,
        estimated_hours: estimatedHours,
        company_id: companyId,
        project_id: maintenanceProjectId ?? initialData.project_id ?? null,
      });
    } else {
      // Guard: sem org_id (user ainda carregando) a inserção criaria a task
      // com org_id="" e ela ficaria invisível por RLS — bloqueia.
      if (!user?.org_id) {
        toast.error("Aguarde — sua organização ainda está carregando. Tente novamente.");
        return;
      }
      await createTask.mutateAsync({
        title: values.title,
        type: values.type as TaskType,
        due_date: values.due_date || null,
        priority: values.priority as TaskPriority,
        status: "pendente",
        notes: values.notes || null,
        assignee_id: values.assignee_id || user.id || null,
        complexity,
        estimated_hours: estimatedHours,
        company_id: companyId,
        lead_id: leadId ?? null,
        project_id: projectId ?? maintenanceProjectId,
        phase_id: phaseId ?? null,
        org_id: user.org_id,
      });
    }
    onSuccess?.();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Atualize os dados da tarefa."
              : "Preencha os dados para criar uma nova tarefa."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input id="task-title" {...register("title")} placeholder="Ex: Ligar para cliente" />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={typeValue || undefined} onValueChange={(v) => setValue("type", v, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo da tarefa" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-danger">{errors.type.message}</p>}
          </div>

          {isMaintenanceType && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Select
                  value={companyIdValue || "__none__"}
                  onValueChange={(v) => { setValue("company_id", v === "__none__" ? "" : v); setValue("task_project_id", ""); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Projeto</Label>
                <Select
                  value={taskProjectIdValue || "__none__"}
                  onValueChange={(v) => setValue("task_project_id", v === "__none__" ? "" : v)}
                  disabled={!companyIdValue || companyIdValue === "__none__"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={companyIdValue ? "Selecionar projeto" : "Escolha o cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {companyProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">Data Limite</Label>
              <Input id="task-due-date" type="date" {...register("due_date")} />
            </div>

            <div className="space-y-1.5">
              <Label>Prioridade *</Label>
              <Select value={priorityValue} onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: p.color }}
                        />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && <p className="text-xs text-danger">{errors.priority.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Complexidade</Label>
              <Select
                value={complexityValue || "__none__"}
                onValueChange={(v) => setValue("complexity", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definida</SelectItem>
                  {TASK_COMPLEXITIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.color }} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-estimated-hours">Tempo Estimado (horas)</Label>
              <Input id="task-estimated-hours" type="number" min={0} step={0.5} placeholder="Ex: 2" {...register("estimated_hours")} />
            </div>
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusValue} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isEditing && initialData?.started_at && (
            <p className="text-xs text-text-muted rounded-lg border border-border p-2.5">
              {initialData.completed_at
                ? <>Tempo gasto: <b className="text-text-primary">{formatDurationBetween(initialData.started_at, initialData.completed_at)}</b></>
                : <>Em andamento desde {formatDate(initialData.started_at)}</>}
            </p>
          )}

          {orgUsers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={assigneeValue ?? "__none__"}
                onValueChange={(v) => setValue("assignee_id", v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {orgUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="task-notes">Notas</Label>
            <Textarea
              id="task-notes"
              {...register("notes")}
              rows={3}
              placeholder="Anotações sobre a tarefa..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || createTask.isPending || updateTask.isPending}
              style={{ background: "var(--primary)" }}
            >
              {isEditing ? "Salvar" : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
