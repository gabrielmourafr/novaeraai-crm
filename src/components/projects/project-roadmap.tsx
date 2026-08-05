"use client";

import { useRef, useState } from "react";
import { FileCode2, Upload, Save, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/format";
import { useUpdateProject, type ProjectWithRelations } from "@/lib/hooks/use-projects";

interface Props {
  project: ProjectWithRelations;
}

export function ProjectRoadmap({ project }: Props) {
  const update = useUpdateProject();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(project.roadmap_html ?? "");
  const [dirty, setDirty] = useState(false);

  const hasRoadmap = !!project.roadmap_html;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".html") && file.type !== "text/html") {
      alert("Só arquivos .html são aceitos.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setDraft(content);
      setDirty(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    await update.mutateAsync({
      id: project.id,
      roadmap_html: draft || null,
      roadmap_filename: null,
      roadmap_updated_at: new Date().toISOString(),
    });
    setDirty(false);
  };

  const handleClear = async () => {
    if (!confirm("Remover o roadmap deste projeto?")) return;
    await update.mutateAsync({ id: project.id, roadmap_html: null, roadmap_filename: null, roadmap_updated_at: null });
    setDraft("");
    setDirty(false);
  };

  const openInNewTab = () => {
    const blob = new Blob([draft || project.roadmap_html || ""], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileCode2 size={16} />
              Roadmap do Projeto
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Escreva o HTML diretamente ou envie um arquivo .html pra registrar o roadmap
              {project.roadmap_updated_at && ` — atualizado em ${formatDateTime(project.roadmap_updated_at)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,text/html"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload size={13} className="mr-1.5" />
              Enviar arquivo .html
            </Button>
            {(draft || hasRoadmap) && (
              <Button size="sm" variant="outline" onClick={openInNewTab}>
                <ExternalLink size={13} className="mr-1.5" />
                Abrir em nova aba
              </Button>
            )}
            {hasRoadmap && (
              <Button size="sm" variant="outline" className="text-danger hover:text-danger" onClick={handleClear}>
                <Trash2 size={13} className="mr-1.5" />
                Remover
              </Button>
            )}
          </div>
        </div>

        <Textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
          placeholder="<html>...</html> — cole o HTML do roadmap aqui, ou use o botão de enviar arquivo"
          rows={12}
          className="font-mono text-xs"
        />

        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={handleSave} disabled={!dirty || update.isPending} style={{ background: "var(--primary)" }}>
            <Save size={13} className="mr-1.5" />
            Salvar Roadmap
          </Button>
        </div>
      </div>

      {(project.roadmap_html || draft) && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Pré-visualização</h4>
          </div>
          <iframe
            srcDoc={draft || project.roadmap_html || ""}
            sandbox=""
            className="w-full"
            style={{ height: 500, border: "none", background: "#fff" }}
            title="Roadmap preview"
          />
        </div>
      )}
    </div>
  );
}
