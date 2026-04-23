"use client";

import { useEffect } from "react";
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
import { TASK_PRIORITIES } from "@/lib/utils/constants";
import { useCreateTask, useUpdateTask } from "@/lib/hooks/use-tasks";
import { useUser, useOrgUsers } from "@/lib/hooks/use-user";
import type { Database } from "@/types/database";

type TaskType = Database["public"]["Tables"]["tasks"]["Row"]["type"];
type TaskPriority = Database["public"]["Tables"]["tasks"]["Row"]["priority"];
type TaskStatus = Database["public"]["Tables"]["tasks"]["Row"]["status"];

const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "followup", label: "Follow-up" },
  { value: "ligacao", label: "Ligação" },
  { value: "email", label: "Email" },
  { value: "reuniao", label: "Reunião" },
  { value: "proposta", label: "Proposta" },
  { value: "entrega", label: "Entrega" },
  { value: "interno", label: "Interno" },
  { value: "outro", label: "Outro" },
];

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
      type: "followup",
      status: "pendente",
    },
  });

  const typeValue = watch("type");
  const priorityValue = watch("priority");
  const statusValue = watch("status");
  const assigneeValue = watch("assignee_id");

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
        });
      } else {
        reset({
          title: "",
          type: "followup",
          due_date: "",
          priority: "media",
          status: "pendente",
          notes: "",
          assignee_id: user?.id ?? "",
        });
      }
    }
  }, [open, initialData, reset, user]);

  const onSubmit = async (values: TaskFormValues) => {
    if (isEditing && initialData) {
      await updateTask.mutateAsync({
        id: initialData.id,
        title: values.title,
        type: values.type as TaskType,
        due_date: values.due_date || null,
        priority: values.priority as TaskPriority,
        status: values.status as TaskStatus,
        notes: values.notes || null,
      });
    } else {
      await createTask.mutateAsync({
        title: values.title,
        type: values.type as TaskType,
        due_date: values.due_date || null,
        priority: values.priority as TaskPriority,
        status: "pendente",
        notes: values.notes || null,
        assignee_id: values.assignee_id || user?.id || null,
        lead_id: leadId ?? null,
        project_id: projectId ?? null,
        phase_id: phaseId ?? null,
        org_id: user?.org_id ?? "",
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
            <Select value={typeValue} onValueChange={(v) => setValue("type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-danger">{errors.type.message}</p>}
          </div>

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
