export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Make nullable fields optional for Insert operations
type NullableToOptional<T> = {
  [K in keyof T as null extends T[K] ? K : never]?: T[K];
} & {
  [K in keyof T as null extends T[K] ? never : K]: T[K];
};

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          settings: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          org_id: string;
          full_name: string;
          email: string;
          avatar_url: string | null;
          role: "admin" | "member";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "users_org_id_fkey"; columns: ["org_id"]; referencedRelation: "organizations"; referencedColumns: ["id"] }
        ];
      };
      companies: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          trade_name: string | null;
          cnpj: string | null;
          segment: string | null;
          size: "mei" | "me" | "epp" | "media" | "grande" | null;
          estimated_revenue: number | null;
          digital_maturity: "basica" | "intermediaria" | "avancada" | null;
          website: string | null;
          address: string | null;
          notes: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["companies"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          org_id: string;
          company_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          job_title: string | null;
          decision_role: "decisor" | "influenciador" | "tecnico" | "usuario" | null;
          linkedin: string | null;
          origin: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["contacts"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      pipelines: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          business_unit: "labs" | "advisory" | "enterprise";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pipelines"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pipelines"]["Insert"]>;
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          name: string;
          position: number;
          color: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pipeline_stages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pipeline_stages"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          company_id: string | null;
          contact_id: string | null;
          pipeline_id: string;
          stage_id: string;
          business_unit: "labs" | "advisory" | "enterprise" | null;
          value: number | null;
          probability: number | null;
          origin: string | null;
          assignee_id: string | null;
          next_followup: string | null;
          temperature: "frio" | "morno" | "quente" | null;
          expected_close_date: string | null;
          closed_at: string | null;
          loss_reason: string | null;
          notes: string | null;
          tags: string[];
          archived: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          business_unit: "labs" | "advisory" | "enterprise";
          category: "saas_plan" | "workshop" | "consultoria" | "projeto" | "programa";
          description: string | null;
          base_price: number;
          recurrence: "mensal" | "trimestral" | "anual" | "pontual";
          status: "ativo" | "inativo" | "desenvolvimento";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      proposals: {
        Row: {
          id: string;
          org_id: string;
          number: string;
          lead_id: string | null;
          company_id: string | null;
          contact_id: string | null;
          business_unit: "labs" | "advisory" | "enterprise";
          discount: number | null;
          total: number;
          valid_until: string | null;
          status: "rascunho" | "enviada" | "visualizada" | "aceita" | "recusada" | "expirada";
          conditions: string | null;
          template: string | null;
          accepted_at: string | null;
          accepted_ip: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["proposals"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["proposals"]["Insert"]>;
        Relationships: [];
      };
      proposal_items: {
        Row: {
          id: string;
          proposal_id: string;
          product_id: string | null;
          name: string;
          quantity: number;
          unit_price: number;
          discount: number | null;
          subtotal: number;
        };
        Insert: Omit<Database["public"]["Tables"]["proposal_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["proposal_items"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          code: string;
          name: string;
          company_id: string;
          contact_id: string | null;
          proposal_id: string | null;
          lead_id: string | null;
          business_unit: "labs" | "advisory" | "enterprise";
          program: string | null;
          assignee_id: string | null;
          status: "kickoff" | "em_andamento" | "pausado" | "em_revisao" | "concluido" | "cancelado";
          start_date: string | null;
          expected_end_date: string | null;
          end_date: string | null;
          contract_value: number | null;
          progress: number;
          description: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["projects"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      project_phases: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          position: number;
          status: "pendente" | "em_andamento" | "concluida";
          start_date: string | null;
          end_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["project_phases"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["project_phases"]["Insert"]>;
        Relationships: [];
      };
      project_milestones: {
        Row: {
          id: string;
          phase_id: string;
          name: string;
          completed: boolean;
          due_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["project_milestones"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["project_milestones"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          org_id: string;
          company_id: string;
          project_id: string | null;
          phase_id: string | null;
          lead_id: string | null;
          name: string;
          file_path: string;
          file_size: number | null;
          file_type: string | null;
          type: "contrato" | "proposta" | "briefing" | "ata" | "apresentacao" | "entrega" | "nda" | "outro";
          version: number;
          description: string | null;
          tags: string[];
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["documents"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      revenues: {
        Row: {
          id: string;
          org_id: string;
          description: string;
          company_id: string | null;
          contact_id: string | null;
          proposal_id: string | null;
          project_id: string | null;
          business_unit: "labs" | "advisory" | "enterprise";
          value: number;
          due_date: string | null;
          paid_at: string | null;
          status: "pendente" | "pago" | "atrasado" | "cancelado";
          payment_method: "pix" | "boleto" | "cartao" | "transferencia" | null;
          recurrence: "pontual" | "mensal" | "trimestral" | "anual";
          category: "assinatura" | "consultoria" | "projeto" | "workshop" | "outro";
          installment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["revenues"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["revenues"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          org_id: string;
          description: string;
          category: "infraestrutura" | "saas" | "marketing" | "pessoal" | "imposto" | "outro";
          project_id: string | null;
          value: number;
          due_date: string | null;
          paid_at: string | null;
          status: "pendente" | "pago" | "atrasado";
          recurrence: "pontual" | "mensal" | "trimestral" | "anual";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          type: "followup" | "ligacao" | "email" | "reuniao" | "proposta" | "entrega" | "interno" | "outro";
          lead_id: string | null;
          contact_id: string | null;
          company_id: string | null;
          proposal_id: string | null;
          project_id: string | null;
          phase_id: string | null;
          assignee_id: string | null;
          due_date: string | null;
          priority: "baixa" | "media" | "alta" | "urgente";
          status: "pendente" | "em_andamento" | "concluida" | "cancelada";
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          type: "demo" | "reuniao_exploratoria" | "followup" | "kickoff" | "review" | "interno" | "outro";
          start_at: string;
          duration_min: number | null;
          participant_ids: string[];
          contact_id: string | null;
          lead_id: string | null;
          project_id: string | null;
          meeting_url: string | null;
          agenda: string | null;
          result: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          org_id: string;
          entity_type: "lead" | "contact" | "company" | "proposal" | "project" | "task" | "event";
          entity_id: string;
          type: "created" | "updated" | "stage_changed" | "note_added" | "file_uploaded" | "email_sent" | "call_made" | "meeting_held" | "proposal_sent" | "proposal_accepted" | "proposal_declined" | "task_completed";
          description: string;
          metadata: Json | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["activities"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
        Relationships: [];
      };
      proposal_views: {
        Row: {
          id: string;
          proposal_id: string;
          viewed_at: string;
          duration_seconds: number | null;
          ip: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["proposal_views"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["proposal_views"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
