"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Document = Database["public"]["Tables"]["documents"]["Row"];
type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
type DocumentType = Database["public"]["Tables"]["documents"]["Row"]["type"];

export type DocumentWithRelations = Document & {
  company?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  uploader?: { id: string; full_name: string } | null;
};

interface UseDocumentsFilters {
  companyId?: string;
  projectId?: string;
  leadId?: string;
}

export const useDocuments = (filters?: UseDocumentsFilters) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["documents", filters?.companyId, filters?.projectId, filters?.leadId],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select(
          "*, company:companies(id, name), project:projects(id, name), uploader:users(id, full_name)"
        )
        .order("created_at", { ascending: false });
      if (filters?.companyId) query = query.eq("company_id", filters.companyId);
      if (filters?.projectId) query = query.eq("project_id", filters.projectId);
      if (filters?.leadId) query = query.eq("lead_id", filters.leadId);
      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentWithRelations[];
    },
  });
};

export interface UploadDocumentInput {
  file: File;
  name: string;
  type: DocumentType;
  companyId?: string;
  projectId?: string;
  phaseId?: string;
  leadId?: string;
  description?: string;
  orgId: string;
  uploadedBy: string;
  onProgress?: (progress: number) => void;
}

export const useUploadDocument = () => {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      const { file, name, type, companyId, projectId, phaseId, leadId, description, orgId, uploadedBy, onProgress } = input;

      const ext = file.name.split(".").pop() ?? "";
      const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      let folder: string;
      if (projectId && companyId) {
        folder = `${orgId}/${companyId}/${projectId}`;
      } else if (leadId && companyId) {
        folder = `${orgId}/${companyId}/leads/${leadId}`;
      } else if (companyId) {
        folder = `${orgId}/${companyId}/general`;
      } else {
        folder = `${orgId}/leads/${leadId}`;
      }
      const storagePath = `${folder}/${safeFileName}`;

      onProgress?.(10);

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      onProgress?.(70);

      const record = {
        org_id: orgId,
        company_id: companyId || null,
        project_id: projectId || null,
        phase_id: phaseId || null,
        lead_id: leadId || null,
        name,
        file_path: storagePath,
        file_size: file.size,
        file_type: file.type || (ext ? `.${ext}` : null),
        type,
        version: 1,
        description: description || null,
        tags: [],
        uploaded_by: uploadedBy,
      } as DocumentInsert;

      const { data, error: dbError } = await supabase
        .from("documents")
        .insert(record)
        .select()
        .single();

      if (dbError) {
        // Clean up storage if DB insert fails
        await supabase.storage.from("documents").remove([storagePath]);
        throw dbError;
      }

      onProgress?.(100);
      return data as Document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento enviado!");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao enviar documento");
    },
  });
};

export const useDeleteDocument = () => {
  const supabase = createClient();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([filePath]);
      // Don't throw on storage error — still remove DB record
      if (storageError) console.warn("Storage delete failed:", storageError.message);

      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento removido!");
    },
    onError: () => toast.error("Erro ao remover documento"),
  });
};

export const getDocumentUrl = (filePath: string) => {
  const supabase = createClient();
  const { data } = supabase.storage.from("documents").getPublicUrl(filePath);
  return data.publicUrl;
};

export const getDocumentSignedUrl = async (filePath: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(filePath, 3600);
  if (error) throw error;
  return data.signedUrl;
};

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "contrato", label: "Contrato" },
  { value: "proposta", label: "Proposta" },
  { value: "briefing", label: "Briefing" },
  { value: "ata", label: "Ata" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "entrega", label: "Entrega" },
  { value: "nda", label: "NDA" },
  { value: "outro", label: "Outro" },
];
