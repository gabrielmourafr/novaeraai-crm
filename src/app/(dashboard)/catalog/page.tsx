"use client";

import { useState } from "react";
import { Plus, Search, Package, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductForm } from "@/components/forms/product-form";
import { formatCurrency } from "@/lib/utils/format";
import { useProducts, useDeleteProduct, type Product } from "@/lib/hooks/use-products";
import { BUSINESS_UNITS } from "@/lib/utils/constants";

type ViewMode = "frente" | "tabela";

const categoryLabels: Record<string, string> = {
  saas_plan: "SaaS Plan",
  workshop: "Workshop",
  consultoria: "Consultoria",
  projeto: "Projeto",
  programa: "Programa",
};

const recurrenceLabels: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  anual: "Anual",
  pontual: "Pontual",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-emerald-100 text-emerald-700" },
  inativo: { label: "Inativo", className: "bg-white/5 text-gray-400" },
  desenvolvimento: { label: "Em desenvolvimento", className: "bg-amber-100 text-amber-700" },
};

const unitColors: Record<string, string> = {
  labs: "bg-blue-950/60 text-blue-300",
  advisory: "bg-indigo-100 text-indigo-700",
  enterprise: "bg-emerald-100 text-emerald-700",
};

export default function CatalogPage() {
  const [view, setView] = useState<ViewMode>("frente");
  const [search, setSearch] = useState("");
  const [filterFrente, setFilterFrente] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [deletingProduct, setDeletingProduct] = useState<Product | undefined>();
  const [, setDefaultUnit] = useState<string>("");

  const { data: products = [], isLoading } = useProducts(search);
  const deleteProduct = useDeleteProduct();

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    await deleteProduct.mutateAsync(deletingProduct.id);
    setDeletingProduct(undefined);
  };

  const handleAddToUnit = (unit: string) => {
    setDefaultUnit(unit);
    setEditingProduct(undefined);
    setFormOpen(true);
  };

  const handleOpenNew = () => {
    setDefaultUnit("");
    setEditingProduct(undefined);
    setFormOpen(true);
  };

  const grouped = BUSINESS_UNITS.reduce(
    (acc, unit) => {
      acc[unit.value] = products.filter((p) => p.business_unit === unit.value);
      return acc;
    },
    {} as Record<string, Product[]>
  );

  const filteredForTable = products
    .filter((p) => {
      if (filterFrente !== "all" && p.business_unit !== filterFrente) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortIndicator = ({ field }: { field: keyof Product }) => {
    if (sortField !== field) return <span className="ml-1 text-text-muted/40">↕</span>;
    return <span className="ml-1 text-primary">{sortAsc ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Produtos & Serviços"
        description="Produtos e serviços oferecidos pela Nova Era AI"
        action={
          <Button style={{ background: "var(--primary)" }} onClick={handleOpenNew}>
            <Plus size={16} className="mr-2" />
            Novo Produto
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {view === "tabela" && (
          <>
            <Select value={filterFrente} onValueChange={setFilterFrente}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Frente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as frentes</SelectItem>
                {BUSINESS_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="desenvolvimento">Em desenvolvimento</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <div className="flex gap-1 border border-border rounded-lg p-1 bg-white ml-auto">
          <button
            onClick={() => setView("frente")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              view === "frente" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <LayoutGrid size={14} />
              Por Frente
            </span>
          </button>
          <button
            onClick={() => setView("tabela")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              view === "tabela" ? "bg-primary text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <List size={14} />
              Tabela
            </span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto encontrado"
          description={search ? "Tente outro termo de busca." : "Adicione produtos ao catálogo."}
          action={{ label: "Novo Produto", onClick: handleOpenNew }}
        />
      ) : view === "frente" ? (
        /* ── Por Frente View ── */
        <div className="space-y-10">
          {BUSINESS_UNITS.map((unit) => {
            const unitProducts = grouped[unit.value] ?? [];
            return (
              <div key={unit.value}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-text-primary">{unit.label}</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${unitColors[unit.value]}`}
                    >
                      {unitProducts.length} {unitProducts.length === 1 ? "produto" : "produtos"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToUnit(unit.value)}
                    className="h-7 text-xs"
                  >
                    <Plus size={13} className="mr-1" />
                    Adicionar
                  </Button>
                </div>

                {unitProducts.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-8 text-center">
                    <p className="text-sm text-text-muted">Nenhum produto nesta frente.</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-primary"
                      onClick={() => handleAddToUnit(unit.value)}
                    >
                      <Plus size={13} className="mr-1" />
                      Adicionar produto
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unitProducts.map((product) => {
                      const statusCfg = statusConfig[product.status] ?? statusConfig.inativo;
                      return (
                        <div
                          key={product.id}
                          className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-text-primary truncate">{product.name}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400">
                                {categoryLabels[product.category] ?? product.category}
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(product)}
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-danger hover:text-danger"
                                onClick={() => setDeletingProduct(product)}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>

                          {product.description && (
                            <p className="text-xs text-text-muted line-clamp-2 mb-3">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                            <div>
                              <p className="text-lg font-bold text-primary">
                                {formatCurrency(product.base_price)}
                              </p>
                              <p className="text-[10px] text-text-muted">
                                / {recurrenceLabels[product.recurrence]}
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.className}`}
                            >
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Tabela View ── */
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {filteredForTable.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-text-muted text-sm">Nenhum produto encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    Nome <SortIndicator field="name" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("business_unit")}
                  >
                    Frente <SortIndicator field="business_unit" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("category")}
                  >
                    Categoria <SortIndicator field="category" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("base_price")}
                  >
                    Preço Base <SortIndicator field="base_price" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("recurrence")}
                  >
                    Recorrência <SortIndicator field="recurrence" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIndicator field="status" />
                  </TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredForTable.map((product) => {
                  const statusCfg = statusConfig[product.status] ?? statusConfig.inativo;
                  const unit = BUSINESS_UNITS.find((u) => u.value === product.business_unit);
                  return (
                    <TableRow key={product.id} className="hover:bg-white/5/50">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-text-primary text-sm">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-text-muted line-clamp-1 max-w-[250px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            unitColors[product.business_unit] ?? "bg-white/5 text-gray-400"
                          }`}
                        >
                          {unit?.label ?? product.business_unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text-secondary">
                          {categoryLabels[product.category] ?? product.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(product.base_price)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {recurrenceLabels[product.recurrence] ?? product.recurrence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
                        >
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-danger hover:text-danger"
                            onClick={() => setDeletingProduct(product)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(undefined);
          setDefaultUnit("");
        }}
        product={editingProduct}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={(v) => !v && setDeletingProduct(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto{" "}
              <strong>{deletingProduct?.name}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger hover:bg-danger/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
