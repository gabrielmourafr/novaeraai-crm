"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];

export const useUser = () => {
  const supabase = createClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role, org_id")
        .eq("id", authUser.id)
        .single();

      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { user, isLoading };
};

export const useOrg = () => {
  const supabase = createClient();
  const { user } = useUser();
  return useQuery<OrgRow | null>({
    queryKey: ["org", user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", user.org_id)
        .single();
      if (error) throw error;
      return data as OrgRow;
    },
    enabled: !!user?.org_id,
  });
};

export const useOrgUsers = () => {
  const supabase = createClient();
  const { user } = useUser();
  return useQuery<UserRow[]>({
    queryKey: ["org-users", user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return [];
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("org_id", user.org_id)
        .order("full_name");
      if (error) throw error;
      return data as UserRow[];
    },
    enabled: !!user?.org_id,
  });
};

export const useUpdateUserRole = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "member" }) => {
      const { error } = await supabase.from("users").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-users"] });
      toast.success("Papel atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar papel"),
  });
};

export const useUpdateOrg = () => {
  const supabase = createClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("organizations").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org"] });
      toast.success("Organização atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar organização"),
  });
};
