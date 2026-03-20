"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Mail, Phone, MessageCircle, Pencil, Trash2, Plus } from "lucide-react";
import { useContacts, useDeleteContact } from "@/lib/hooks/use-contacts";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactForm } from "@/components/forms/contact-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatInitials } from "@/lib/utils/format";
import { LEAD_ORIGINS } from "@/lib/utils/constants";
import type { Database } from "@/types/database";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: contacts, isLoading } = useContacts(debouncedSearch || undefined);
  const deleteContact = useDeleteContact();

  const handleEdit = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingContact(undefined);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingContact(undefined);
  };

  const originLabel = (value: string | null) =>
    LEAD_ORIGINS.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <PageHeader title="Contatos" description="Gerencie seus contatos e pessoas-chave.">
        <Button onClick={handleNew} style={{ background: "var(--primary)" }}>
          <Plus size={16} className="mr-1" />
          Novo Contato
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : !contacts?.length ? (
        <EmptyState
          icon={Users}
          title="Nenhum contato encontrado"
          description="Adicione seus primeiros contatos para começar a gerenciar seus relacionamentos."
          action={{ label: "Novo Contato", onClick: handleNew }}
        />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
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
                  className="cursor-pointer hover:bg-surface-hover"
                  onClick={() => router.push(`/contacts/${contact.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "var(--primary)" }}
                      >
                        {formatInitials(contact.full_name)}
                      </div>
                      <span className="font-medium text-sm text-text-primary">
                        {contact.full_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {contact.company_id ? (
                      <span className="text-text-primary">&mdash;</span>
                    ) : (
                      <span>&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {contact.job_title ?? <span className="text-text-muted/50">&mdash;</span>}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail size={13} />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-sm text-text-muted/50">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-sm text-text-primary hover:text-primary flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={13} />
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-text-muted/50">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.origin ? (
                      <Badge variant="secondary" className="text-xs">
                        {originLabel(contact.origin)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-text-muted/50">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.phone && (
                        <a
                          href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MessageCircle size={13} />
                          </Button>
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Mail size={13} />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => handleEdit(contact as Contact, e)}
                      >
                        <Pencil size={13} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-danger"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover contato?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O contato &quot;
                              {contact.full_name}&quot; será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteContact.mutate(contact.id)}
                              className="bg-danger hover:bg-danger/90"
                            >
                              Remover
                            </AlertDialogAction>
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

      <ContactForm open={formOpen} onClose={handleClose} contact={editingContact} />
    </div>
  );
}
