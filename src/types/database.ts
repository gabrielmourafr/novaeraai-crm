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
          role: "admin" | "member" | "developer";
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
          diagnostico: string | null;
          arquitetura_solucao: string | null;
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
          business_unit: "labs" | "advisory" | "enterprise" | "intelligence";
          program: string | null;
          assignee_id: string | null;
          status:
            | "contrato_assinado"
            | "em_desenvolvimento"
            | "em_validacao_interna"
            | "pronto_para_entrega"
            | "roadmap"
            | "entregue_tet"
            | "ativo_mensalidade"
            | "upsell_identificado"
            | "churned"
            | "kickoff"
            | "em_andamento"
            | "pausado"
            | "em_revisao"
            | "concluido"
            | "cancelado";
          start_date: string | null;
          expected_end_date: string | null;
          end_date: string | null;
          contract_value: number | null;
          receivable_value: number | null;
          receivable_due_date: string | null;
          received_value: number | null;
          received_date: string | null;
          progress: number;
          description: string | null;
          tags: string[];
          billing_day: number | null;
          billing_amount: number | null;
          contract_start: string | null;
          contract_end: string | null;
          renewal_type: "auto" | "manual" | "no_renewal" | null;
          billing_status: "sem_mensalidade" | "ativo" | "suspenso" | "encerrado" | null;
          // V2: identificação e contexto
          niche: string | null;
          primary_contact_name: string | null;
          primary_contact_whatsapp: string | null;
          closed_by_user_id: string | null;
          closed_by_external_label: string | null;
          developer_user_id: string | null;
          // V2: financeiro
          contract_plan: "core" | "evolucao" | "parceiro" | null;
          dev_commission_pct: number | null;
          infra_setup_cost: number | null;
          infra_monthly_cost: number | null;
          // V2: desenvolvimento
          repo_url: string | null;
          architecture_doc_url: string | null;
          dev_started_at: string | null;
          promised_delivery_date: string | null;
          completion_percent: number | null;
          risks_blockers: string | null;
          code_review_done: boolean | null;
          homologation_url: string | null;
          implementation_notes: string | null;
          // V2: pós-entrega/mensalidade
          monthly_billing_start_date: string | null;
          latest_nps_score: number | null;
          latest_nps_date: string | null;
          latest_meeting_date: string | null;
          latest_report_url: string | null;
          crs_opened_count: number | null;
          crs_resolved_count: number | null;
          upsell_opportunity_note: string | null;
          churn_risk: "baixo" | "medio" | "alto" | null;
          // V2: roadmap
          roadmap_html: string | null;
          roadmap_filename: string | null;
          roadmap_updated_at: string | null;
          auto_created_from_lead: boolean;
          lead_win_notice_dismissed: boolean;
          predicted_first_billing_override: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["projects"]["Row"], "id" | "created_at" | "updated_at" | "auto_created_from_lead" | "lead_win_notice_dismissed">> & { auto_created_from_lead?: boolean; lead_win_notice_dismissed?: boolean };
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
      project_products: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          name: string;
          description: string | null;
          value: number | null;
          position: number;
          status: "planejado" | "em_andamento" | "concluido" | "cancelado";
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["project_products"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["project_products"]["Insert"]>;
        Relationships: [];
      };
      project_product_stages: {
        Row: {
          id: string;
          org_id: string;
          product_id: string;
          name: string;
          position: number;
          status: "pendente" | "em_andamento" | "concluida" | "bloqueada";
          promised_date: string | null;
          forecast_date: string | null;
          actual_end_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["project_product_stages"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["project_product_stages"]["Insert"]>;
        Relationships: [];
      };
      project_monthly_checkins: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          reference_month: string;
          nps_score: number | null;
          meeting_done: boolean;
          meeting_date: string | null;
          report_url: string | null;
          crs_opened: number | null;
          crs_resolved: number | null;
          upsell_opportunity: string | null;
          churn_risk: "baixo" | "medio" | "alto" | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["project_monthly_checkins"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["project_monthly_checkins"]["Insert"]>;
        Relationships: [];
      };
      upsell_suggestions: {
        Row: {
          id: string;
          org_id: string;
          company_id: string;
          project_id: string | null;
          product_id: string | null;
          title: string;
          description: string | null;
          reason: string | null;
          estimated_value: number | null;
          priority: "baixa" | "media" | "alta" | "urgente";
          status: "sugerido" | "em_negociacao" | "convertido" | "descartado";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["upsell_suggestions"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["upsell_suggestions"]["Insert"]>;
        Relationships: [];
      };
      project_improvements: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          product_id: string | null;
          title: string;
          description: string | null;
          priority: "baixa" | "media" | "alta" | "urgente";
          status: "sugerida" | "aprovada" | "em_desenvolvimento" | "entregue" | "rejeitada";
          source: "interno" | "cliente" | null;
          target_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["project_improvements"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["project_improvements"]["Insert"]>;
        Relationships: [];
      };
      project_costs: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          product_id: string | null;
          category: "pessoal" | "infraestrutura" | "software" | "terceiros" | "marketing" | "outros";
          cost_type: "implementacao" | "mensal_recorrente" | "eventual";
          description: string;
          amount: number;
          incurred_date: string | null;
          status: "previsto" | "pago" | "cancelado";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["project_costs"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["project_costs"]["Insert"]>;
        Relationships: [];
      };
      project_installments: {
        Row: {
          id: string;
          org_id: string;
          project_id: string;
          position: number;
          description: string;
          percentage: number;
          amount: number;
          phase_id: string | null;
          due_date: string | null;
          status: "pendente" | "faturado" | "pago" | "atrasado" | "cancelado";
          paid_at: string | null;
          invoice_url: string | null;
          nf_number: string | null;
          nf_issued_at: string | null;
          notes: string | null;
          payment_method: "pix" | "boleto" | "cartao" | "transferencia" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["project_installments"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["project_installments"]["Insert"]>;
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
          type: "contrato" | "arquitetura_inicial" | "arquitetura_tecnica" | "proposta" | "briefing" | "ata" | "apresentacao" | "entrega" | "nda" | "outro";
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
          business_unit: "labs" | "advisory" | "enterprise" | "intelligence";
          value: number;
          due_date: string | null;
          paid_at: string | null;
          status: "pendente" | "pago" | "atrasado" | "cancelado";
          payment_method: "pix" | "boleto" | "cartao" | "transferencia" | null;
          recurrence: "pontual" | "mensal" | "trimestral" | "anual";
          category: "assinatura" | "consultoria" | "projeto" | "workshop" | "outro";
          installment: string | null;
          auto_generated: boolean;
          auto_source: "project_receivable" | "project_received" | "project_monthly_billing" | null;
          nf_number: string | null;
          nf_issued_at: string | null;
          nf_link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["revenues"]["Row"], "id" | "created_at" | "updated_at" | "auto_generated">> & { auto_generated?: boolean };
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
          expense_type: "fixo" | "variavel" | null;
          company_id: string | null;
          billing_day: number | null;
          contract_start: string | null;
          contract_end: string | null;
          is_recurring_template: boolean;
          template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at" | "updated_at" | "is_recurring_template"> & { is_recurring_template?: boolean };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          type:
            | "followup" | "ligacao" | "email" | "reuniao" | "proposta" | "entrega" | "interno" | "outro"
            | "financeiro" | "contrato" | "arquitetura_solucao"
            | "manutencao_adaptativa" | "manutencao_aditiva" | "manutencao_corretiva";
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
          complexity: "baixa" | "media" | "alta" | null;
          estimated_hours: number | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "updated_at" | "started_at" | "completed_at">>;
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
          google_event_id: string | null;
          google_synced_at: string | null;
          sync_source: "crm" | "google";
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["events"]["Row"], "id" | "created_at" | "updated_at" | "sync_source">> & { sync_source?: "crm" | "google" };
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
      google_calendar_connections: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          google_email: string | null;
          access_token: string;
          refresh_token: string;
          token_expiry: string;
          calendar_id: string;
          sync_enabled: boolean;
          last_synced_at: string | null;
          sync_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["google_calendar_connections"]["Row"], "id" | "created_at" | "updated_at" | "calendar_id" | "sync_enabled">> & { calendar_id?: string; sync_enabled?: boolean };
        Update: Partial<Database["public"]["Tables"]["google_calendar_connections"]["Insert"]>;
        Relationships: [];
      };
      partner_payments: {
        Row: {
          id: string;
          org_id: string;
          recipient_type: "parceiro" | "desenvolvedor";
          recipient_name: string;
          recipient_user_id: string | null;
          project_id: string | null;
          description: string;
          amount: number;
          due_date: string | null;
          paid_at: string | null;
          status: "pendente" | "pago" | "atrasado" | "cancelado";
          notes: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["partner_payments"]["Row"], "id" | "created_at" | "updated_at" | "status">> & { status?: "pendente" | "pago" | "atrasado" | "cancelado" };
        Update: Partial<Database["public"]["Tables"]["partner_payments"]["Insert"]>;
        Relationships: [];
      };
      revenue_goals: {
        Row: {
          id: string;
          org_id: string;
          reference_month: string;
          revenue_target: number;
          commercial_target: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["revenue_goals"]["Row"], "id" | "created_at" | "updated_at">>;
        Update: Partial<Database["public"]["Tables"]["revenue_goals"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string;
          actor_id: string | null;
          actor_name: string | null;
          actor_email: string | null;
          action: "created" | "updated" | "deleted" | "login";
          entity_type: string;
          entity_id: string | null;
          entity_label: string | null;
          changes: Json | null;
          created_at: string;
        };
        Insert: NullableToOptional<Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id" | "created_at">>;
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
