"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  Upload,
  FolderOpen,
  Building2,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils/format";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  getDocumentSignedUrl,
  DOCUMENT_TYPES,
  type DocumentWithRelations,
} from "@/lib/hooks/use-documents";
import { useCompanies } from "@/lib/hooks/use-companies";
import { useProjects } from "@/lib/hooks/use-projects";
import { useUser } from "@/lib/hooks/use-user";
import { useOrg } from "@/lib/hooks/use-user";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return FileText;
  if (t.includes("spreadsheet") || t.includes("excel") || t.endsWith("xlsx") || t.endsWith("xls") || t.includes("csv")) return FileSpreadsheet;
  if (t.includes("presentation") || t.includes("powerpoint") || t.endsWith("pptx") || t.endsWith("ppt")) return Presentation;
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg") || t.includes("gif") || t.includes("webp")) return Image;
  if (t.includes("word") || t.includes("document") || t.endsWith("docx") || t.endsWith("doc")) return FileText;
  return File;
}

function getFileIconColor(fileType: string | null): string {
  if (!fileType) return "text-gray-400";
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return "text-red-500";
  if (t.includes("spreadsheet") || t.includes("excel") || t.endsWith("xlsx") || t.endsWith("xls")) return "text-green-600";
  if (t.includes("presentation") || t.endsWith("pptx") || t.endsWith("ppt")) return "text-orange-500";
  if (t.includes("image")) return "text-purple-500";
  if (t.includes("word") || t.endsWith("docx") || t.endsWith("doc")) return "text-blue-500";
  return "text-gray-500";
}

// ─── Staged file type ─────────────────────────────────────────────────────────

interface StagedFile {
  file: File;
  name: string;
  type: DocumentType;
  companyId: string;
  projectId: string;
  progress: number;
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, onDelete }: { doc: DocumentWithRelations; onDelete: () => void }) {
  const DocIcon = getFileIcon(doc.file_type);
  const iconColor = getFileIconColor(doc.file_type);
  const isPreviewable = doc.file_type?.includes("pdf") || doc.file_type?.includes("image");
  const docTypeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type;

  const handleDownload = async () => {
    const url = await getDocumentSignedUrl(doc.file_path);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
  };

  const handlePreview = async () => {
    const url = await getDocumentSignedUrl(doc.file_path);
    window.open(url, "_blank");
  };

  return (
    <div className="rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow flex flex-col" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
      {/* Icon + version */}
      <div className="flex items-start justify-between gap-2">
        <DocIcon size={32} className={iconColor} />
        <span className="text-[10px] font-medium bg-white/5 text-text-muted px-1.5 py-0.5 rounded flex-shrink-0">
          v{doc.version}
        </span>
      </div>

      {/* Name + type */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-[#0F172A] line-clamp-2 leading-snug">{doc.name}</p>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-text-muted mt-1.5">
          {docTypeLabel}
        </span>
      </div>

      {/* Company / project */}
      <div className="space-y-0.5">
        {doc.company && (
          <p className="text-xs text-text-muted flex items-center gap-1">
            <Building2 size={10} />
            {doc.company.name}
          </p>
        )}
        {doc.project && (
          <p className="text-xs text-text-muted">{doc.project.name}</p>
        )}
      </div>

      {/* Date + uploader */}
      <p className="text-xs text-text-muted">
        {formatDate(doc.created_at)}
        {doc.uploader && ` · ${doc.uploader.full_name}`}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download">
          <Download size={13} />
        </Button>
        {isPreviewable && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePreview} title="Visualizar">
            <Eye size={13} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-400 hover:text-red-600 ml-auto"
          onClick={onDelete}
          title="Remover"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  uploadedBy: string;
  initialCompanyId?: string;
  initialProjectId?: string;
}

function UploadModal({ open, onClose, orgId, uploadedBy, initialCompanyId = "", initialProjectId = "" }: UploadModalProps) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { data: companies = [] } = useCompanies();
  const { data: projects = [] } = useProjects();
  const uploadDocument = useUploadDocument();

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: StagedFile[] = accepted.map((file) => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      type: "outro" as DocumentType,
      companyId: initialCompanyId,
      projectId: initialProjectId,
      progress: 0,
    }));
    setStaged((prev) => [...prev, ...newFiles]);
  }, [initialCompanyId, initialProjectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const handleUploadAll = async () => {
    setUploading(true);
    for (let i = 0; i < staged.length; i++) {
      const f = staged[i];
      if (!f.companyId) continue;
      await uploadDocument.mutateAsync({
        file: f.file,
        name: f.name,
        type: f.type,
        companyId: f.companyId,
        projectId: f.projectId || undefined,
        orgId,
        uploadedBy,
        onProgress: (pct) => {
          setStaged((prev) => prev.map((x, idx) => idx === i ? { ...x, progress: pct } : x));
        },
      });
    }
    setStaged([]);
    setUploading(false);
    onClose();
  };

  const filteredProjects = (companyId: string) =>
    projects.filter((p) => p.company_id === companyId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Arquivos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-[#0B87C3] bg-[#0B87C3]/5"
                : "border-border bg-white/5 hover:border-[#0B87C3]/50"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-[#0B87C3]" />
              <p className="text-sm font-medium text-[#0F172A]">
                {isDragActive ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para selecionar"}
              </p>
              <p className="text-xs text-text-muted">Múltiplos arquivos suportados</p>
            </div>
          </div>

          {/* Staged files */}
          {staged.length > 0 && (
            <div className="space-y-3">
              {staged.map((f, i) => (
                <div key={i} className="rounded-lg p-3 space-y-3" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#0F172A] flex-1 truncate">{f.file.name}</p>
                    <button
                      onClick={() => setStaged((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-text-muted hover:text-red-500 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do arquivo</Label>
                      <Input
                        value={f.name}
                        onChange={(e) =>
                          setStaged((prev) => prev.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={f.type}
                        onValueChange={(v) =>
                          setStaged((prev) => prev.map((x, idx) => idx === i ? { ...x, type: v as DocumentType } : x))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Empresa *</Label>
                      <Select
                        value={f.companyId}
                        onValueChange={(v) =>
                          setStaged((prev) => prev.map((x, idx) => idx === i ? { ...x, companyId: v, projectId: "" } : x))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Projeto (opcional)</Label>
                      <Select
                        value={f.projectId || "__none__"}
                        onValueChange={(v) =>
                          setStaged((prev) => prev.map((x, idx) => idx === i ? { ...x, projectId: v === "__none__" ? "" : v } : x))
                        }
                        disabled={!f.companyId}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum (geral)</SelectItem>
                          {filteredProjects(f.companyId).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {f.progress > 0 && (
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0B87C3] transition-all" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
                <Button
                  size="sm"
                  style={{ background: "var(--primary)" }}
                  onClick={handleUploadAll}
                  disabled={uploading || staged.every((f) => !f.companyId)}
                >
                  {uploading ? "Enviando..." : `Enviar ${staged.length} arquivo(s)`}
                </Button>
              </div>
            </div>
          )}

          {staged.length === 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const { user } = useUser();
  const { data: org } = useOrg();
  const { data: companies = [] } = useCompanies();
  const { data: allProjects = [] } = useProjects();
  const { data: documents = [], isLoading } = useDocuments({
    companyId: selectedCompanyId ?? undefined,
    projectId: selectedProjectId ?? undefined,
  });
  const deleteDocument = useDeleteDocument();

  // Breadcrumb
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedProject = allProjects.find((p) => p.id === selectedProjectId);

  // Count docs per company (all docs query - use without filters for counts)
  const { data: allDocs = [] } = useDocuments();
  const docCountByCompany = (cid: string) => allDocs.filter((d) => d.company_id === cid).length;
  const docCountByProject = (pid: string) => allDocs.filter((d) => d.project_id === pid).length;

  const toggleCompany = (cid: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid);
      else next.add(cid);
      return next;
    });
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(12,21,38,0.8)", border: "1px solid rgba(11,135,195,0.15)" }}>
          <div className="px-4 py-3 border-b border-border bg-white/5">
            <p className="text-xs font-semibold uppercase text-text-muted tracking-wider">Navegação</p>
          </div>
          <div className="p-2 space-y-0.5">
            {/* All docs */}
            <button
              onClick={() => { setSelectedCompanyId(null); setSelectedProjectId(null); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                !selectedCompanyId
                  ? "bg-[#0B87C3]/10 text-[#0B87C3] font-medium"
                  : "text-text-muted hover:bg-white/5"
              )}
            >
              <FolderOpen size={15} />
              <span className="flex-1">Todos os Documentos</span>
              <span className="text-[10px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded">
                {allDocs.length}
              </span>
            </button>

            {/* Company tree */}
            {companies.map((company) => {
              const companyProjects = allProjects.filter((p) => p.company_id === company.id);
              const isExpanded = expandedCompanies.has(company.id);
              const isSelected = selectedCompanyId === company.id && !selectedProjectId;
              const count = docCountByCompany(company.id);

              return (
                <div key={company.id}>
                  <div className="flex items-center">
                    <button
                      onClick={() => { setSelectedCompanyId(company.id); setSelectedProjectId(null); }}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                        isSelected
                          ? "bg-[#0B87C3]/10 text-[#0B87C3] font-medium"
                          : "text-text-muted hover:bg-white/5"
                      )}
                    >
                      <Building2 size={14} />
                      <span className="flex-1 truncate">{company.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded">
                          {count}
                        </span>
                      )}
                    </button>
                    {companyProjects.length > 0 && (
                      <button
                        onClick={() => toggleCompany(company.id)}
                        className="p-1.5 text-text-muted hover:text-text-muted rounded"
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    )}
                  </div>

                  {isExpanded && companyProjects.map((project) => {
                    const isProjectSelected = selectedProjectId === project.id;
                    const pCount = docCountByProject(project.id);
                    return (
                      <button
                        key={project.id}
                        onClick={() => { setSelectedCompanyId(company.id); setSelectedProjectId(project.id); }}
                        className={cn(
                          "w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg text-sm transition-colors text-left",
                          isProjectSelected
                            ? "bg-[#0B87C3]/10 text-[#0B87C3] font-medium"
                            : "text-text-muted hover:bg-white/5"
                        )}
                      >
                        <span className="flex-1 truncate">{project.name}</span>
                        {pCount > 0 && (
                          <span className="text-[10px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded">
                            {pCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        <PageHeader
          title="Documentos"
          description="Repositório central de documentos por cliente e projeto"
          action={
            <Button
              style={{ background: "var(--primary)" }}
              onClick={() => setUploadOpen(true)}
            >
              <Upload size={16} className="mr-2" />
              Upload de Arquivo
            </Button>
          }
        />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <button
            onClick={() => { setSelectedCompanyId(null); setSelectedProjectId(null); }}
            className="hover:text-[#0B87C3] transition-colors"
          >
            Documentos
          </button>
          {selectedCompany && (
            <>
              <ChevronRight size={14} />
              <button
                onClick={() => setSelectedProjectId(null)}
                className="hover:text-[#0B87C3] transition-colors"
              >
                {selectedCompany.name}
              </button>
            </>
          )}
          {selectedProject && (
            <>
              <ChevronRight size={14} />
              <span className="text-[#0F172A] font-medium">{selectedProject.name}</span>
            </>
          )}
        </div>

        {/* Documents grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl border border-border bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento encontrado"
            description={
              selectedCompanyId
                ? "Faça upload do primeiro documento para este cliente."
                : "Faça upload de documentos usando o botão acima."
            }
            action={{ label: "Upload de Arquivo", onClick: () => setUploadOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={() => deleteDocument.mutate({ id: doc.id, filePath: doc.file_path })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        orgId={org?.id ?? user?.org_id ?? ""}
        uploadedBy={user?.id ?? ""}
        initialCompanyId={selectedCompanyId ?? ""}
        initialProjectId={selectedProjectId ?? ""}
      />
    </div>
  );
}
