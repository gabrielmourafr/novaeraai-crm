"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

export const useContacts = (search?: string, companyId?: string) => {
  const supabase = createClient();
  return useQuery({
    queryKey: ["contacts", search, companyId],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select(
          "id, org_id, company_id, full_name, email, phone, job_title, decision_role, linkedin, origin, tags, created_at, updated_at, created_by"
        )
        .order("full_name");
      if (search) query = query.ilike("full_name", `%${search}%`);
      if (companyId) query = query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useContact = (id: string) => {
  const supabase = createClient();
  return useQuery<Contact | null>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
};

export const useCreateContact = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactInsert) => {
      const { data, error } = await supabase.from("contacts").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato criado!");
    },
    onError: () => toast.error("Erro ao criar contato"),
  });
};

export const useUpdateContact = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ContactUpdate & { id: string }) => {
      const { error } = await supabase.from("contacts").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", vars.id] });
      toast.success("Contato atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar contato"),
  });
};

export const useDeleteContact = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato removido!");
    },
    onError: () => toast.error("Erro ao remover contato"),
  });
};
