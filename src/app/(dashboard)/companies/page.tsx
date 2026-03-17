"use client";

import { useState, useEffect } from "react";
import { Building2, Globe, Pencil, Trash2, Plus } from "lucide-react";
import { useCompanies, useDeleteCompany } from "@/lib/hooks/use-companies";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CompanyForm } from "@/components/forms/company-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatInitials, formatDate } from "@/lib/utils/format";
import { COMPANY_SEGMENTS, COMPANY_SIZES } from "@/lib/utils/constants";
import type { Database } from "@/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: companies, isLoading } = useCompanies(debouncedSearch || undefined);
  const deleteCompany = useDeleteCompany();

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingCompany(undefined);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingCompany(undefined);
  };

  const segmentLabel = (value: string | null) =>
    COMPANY_SEGMENTS.find((s) => s.value === value)?.label ?? value;

  const sizeLabel = (value: string | null) =>
    COMPANY_SIZES.find((s) => s.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <PageHeader title="Empresas" description="Gerencie suas empresas e contas.">
        <Button onClick={handleNew} style={{ background: "var(--primary)" }}>
          <Plus size={16} className="mr-1" />
          Nova Empresa
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      ) : !companies?.length ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma empresa encontrada"
          description="Adicione sua primeira empresa para começar a organizar seus clientes e prospects."
          action={{ label: "Nova Empresa", onClick: handleNew }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 hover:border-primary/20"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "var(--primary)" }}
                  >
                    {formatInitials(company.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm leading-tight">
                      {company.name}
                    </p>
                    {company.trade_name && (
                      <p className="text-xs text-text-muted">{company.trade_name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {company.segment && (
                  <Badge variant="secondary" className="text-xs">
                    {segmentLabel(company.segment)}
                  </Badge>
                )}
                {company.size && (
                  <Badge variant="outline" className="text-xs">
                    {sizeLabel(company.size)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  {company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe size={12} />
                      Site
                    </a>
                  ) : (
                    <span>{formatDate(company.created_at)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleEdit(company as Company)}
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
                        <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A empresa &quot;{company.name}&quot; será
                          removida permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCompany.mutate(company.id)}
                          className="bg-danger hover:bg-danger/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CompanyForm open={formOpen} onClose={handleClose} company={editingCompany} />
    </div>
  );
}
