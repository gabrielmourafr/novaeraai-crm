"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, LayoutGrid, List, Search,
  Users, Mail, Phone, MessageCircle, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { KanbanBoard } from "@/components/leads/kanban-board";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadForm } from "@/components/forms/lead-form";
import { ContactForm } from "@/components/forms/contact-form";
import { useLeads, useDeleteLead, useMoveLead, type LeadWithRelations } from "@/lib/hooks/use-leads";
import { usePipelines } from "@/lib/hooks/use-pipelines";
import { useContacts, useDeleteContact } from "@/lib/hooks/use-contacts";
import { formatInitials } from "@/lib/utils/format";
import { LEAD_ORIGINS } from "@/lib/utils/constants";
import type { Database } from "@/types/database";

type ViewMode = "kanban" | "list";
type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export default function LeadsPage() {
  const router = useRouter();

  // --- Leads state ---
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithRelations | undefined>();
  const [deletingLead, setDeletingLead] = useState<LeadWithRelations | undefined>();
  const [defaultStageId, setDefaultStageId] = useState<string>("");

  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id || "";
  const activePipeline = pipelines?.find((p) => p.id === activePipelineId);
  const { data: leads = [], isLoading: leadsLoading } = useLeads(
    view === "kanban" ? activePipelineId : undefined,
    undefined,
    search
  );
  const deleteLead = useDeleteLead();
  const moveLead = useMoveLead();

  // --- Contacts state ---
  const [contactSearch, setContactSearch] = useState("");
  const [debouncedContactSearch, setDebouncedContactSearch] = useState("");
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedContactSearch(contactSearch), 300);
    return () => clearTimeout(t);
  }, [contactSearch]);

  const { data: contacts, isLoading: contactsLoading } = useContacts(debouncedContactSearch || undefined);
  const deleteContact = useDeleteContact();

  // --- Lead handlers ---
  const handleAddLead = (stageId: string) => {
    setEditingLead(undefined);
    setDefaultStageId(stageId);
    setFormOpen(true);
  };
  const handleEditLead = (lead: LeadWithRelations) => {
    setEditingLead(lead);
    setFormOpen(true);
  };
  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    await deleteLead.mutateAsync(deletingLead.id);
    setDeletingLead(undefined);
  };
  const handleMoveLead = (leadId: string, stageId: string) => {
    moveLead.mutate({ id: leadId, stage_id: stageId });
  };

  // --- Contact handlers ---
  const handleEditContact = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(contact);
    setContactFormOpen(true);
  };
  const handleNewContact = () => {
    setEditingContact(undefined);
    setContactFormOpen(true);
  };

  const originLabel = (value: string | null) =>
    LEAD_ORIGINS.find((o) => o.value === value)?.label ?? value;

  const isLeadsLoading = pipelinesLoading || leadsLoading;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="leads">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">CRM</h1>
            <p className="text-sm text-text-muted">Gerencie seus leads e contatos</p>
          </div>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="leads" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <LayoutGrid size={14} className="mr-1.5" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users size={14} className="mr-1.5" />
              Contatos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── LEADS TAB ─── */}
        <TabsContent value="leads" className="space-y-5 mt-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {pipelines && pipelines.length > 0 && (
                <Select value={activePipelineId} onValueChange={setSelectedPipelineId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="relative min-w-[200px] max-w-sm flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  placeholder="Buscar leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex gap-1 border border-border rounded-lg p-1 bg-white/5">
                <button
                  onClick={() => setView("kanban")}
                  className={`p-1.5 rounded ${view === "kanban" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-1.5 rounded ${view === "list" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            <Button style={{ background: "var(--primary)" }} onClick={() => { setEditingLead(undefined); setDefaultStageId(""); setFormOpen(true); }}>
              <Plus size={16} className="mr-2" />
              Novo Lead
            </Button>
          </div>

          {view === "kanban" && activePipeline && (
            <div className="flex gap-3 text-sm text-text-muted">
              <span>{leads.length} leads</span>
              <span>·</span>
              <span>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  leads.reduce((acc, l) => acc + (l.value ?? 0), 0)
                )}{" "}em aberto
              </span>
            </div>
          )}

          {isLeadsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-text-muted text-sm">Carregando...</div>
            </div>
          ) : !pipelines?.length ? (
            <EmptyState icon={LayoutGrid} title="Nenhum pipeline encontrado" description="Os pipelines são criados automaticamente ao registrar-se." />
          ) : view === "kanban" && activePipeline ? (
            <KanbanBoard pipeline={activePipeline} leads={leads} onMoveLead={handleMoveLead} onEditLead={handleEditLead} onDeleteLead={setDeletingLead} onAddLead={handleAddLead} />
          ) : leads.length === 0 ? (
            <EmptyState icon={LayoutGrid} title="Nenhum lead encontrado" description={search ? "Tente outro termo de busca." : "Crie seu primeiro lead."} action={{ label: "Novo Lead", onClick: () => setFormOpen(true) }} />
          ) : (
            <LeadsTable leads={leads} onEdit={handleEditLead} onDelete={setDeletingLead} />
          )}
        </TabsContent>

        {/* ─── CONTACTS TAB ─── */}
        <TabsContent value="contacts" className="space-y-5 mt-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="Buscar contato..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button style={{ background: "var(--primary)" }} onClick={handleNewContact}>
              <Plus size={16} className="mr-2" />
              Novo Contato
            </Button>
          </div>

          {contactsLoading ? (
            <div className="bg-card rounded-xl border border-border">
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ) : !contacts?.length ? (
            <EmptyState icon={Users} title="Nenhum contato encontrado" description="Adicione seus primeiros contatos." action={{ label: "Novo Contato", onClick: handleNewContact }} />
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-white/5"
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "var(--primary)" }}>
                            {formatInitials(contact.full_name)}
                          </div>
                          <span className="font-medium text-sm text-text-primary">{contact.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-text-muted">
                        {contact.job_title ?? <span className="text-text-muted/50">&mdash;</span>}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Mail size={13} />{contact.email}
                          </a>
                        ) : <span className="text-sm text-text-muted/50">&mdash;</span>}
                      </TableCell>
                      <TableCell>
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="text-sm text-text-primary hover:text-primary flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Phone size={13} />{contact.phone}
                          </a>
                        ) : <span className="text-sm text-text-muted/50">&mdash;</span>}
                      </TableCell>
                      <TableCell>
                        {contact.origin ? (
                          <Badge variant="secondary" className="text-xs">{originLabel(contact.origin)}</Badge>
                        ) : <span className="text-sm text-text-muted/50">&mdash;</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {contact.phone && (
                            <a href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MessageCircle size={13} /></Button>
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Mail size={13} /></Button>
                            </a>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => handleEditContact(contact as Contact, e)}>
                            <Pencil size={13} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-danger"><Trash2 size={13} /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover contato?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O contato &quot;{contact.full_name}&quot; será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteContact.mutate(contact.id)} className="bg-danger hover:bg-danger/90">Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Forms & Dialogs */}
      <LeadForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingLead(undefined); }}
        lead={editingLead}
        defaultPipelineId={activePipelineId}
        defaultStageId={defaultStageId}
      />

      <ContactForm
        open={contactFormOpen}
        onClose={() => { setContactFormOpen(false); setEditingContact(undefined); }}
        contact={editingContact}
      />

      <AlertDialog open={!!deletingLead} onOpenChange={(v) => !v && setDeletingLead(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead <strong>{deletingLead?.title}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLead} className="bg-danger hover:bg-danger/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
