export const BUSINESS_UNITS = [
  { value: "labs", label: "Nova Era Labs" },
  { value: "advisory", label: "Nova Era Advisory" },
  { value: "enterprise", label: "Nova Era Enterprise" },
] as const;

export const TEMPERATURES = [
  { value: "frio", label: "Frio", color: "#6366F1" },
  { value: "morno", label: "Morno", color: "#F59E0B" },
  { value: "quente", label: "Quente", color: "#EF4444" },
] as const;

export const LEAD_ORIGINS = [
  { value: "site", label: "Site" },
  { value: "indicacao", label: "Indicação" },
  { value: "ads", label: "Ads" },
  { value: "evento", label: "Evento" },
  { value: "inbound", label: "Inbound" },
  { value: "advisory", label: "Advisory" },
] as const;

export const LOSS_REASONS = [
  { value: "preco", label: "Preço" },
  { value: "timing", label: "Timing" },
  { value: "concorrente", label: "Concorrente" },
  { value: "sem_fit", label: "Sem fit" },
  { value: "outro", label: "Outro" },
] as const;

export const COMPANY_SIZES = [
  { value: "mei", label: "MEI" },
  { value: "me", label: "ME" },
  { value: "epp", label: "EPP" },
  { value: "media", label: "Média" },
  { value: "grande", label: "Grande" },
] as const;

export const COMPANY_SEGMENTS = [
  { value: "industria", label: "Indústria" },
  { value: "comercio", label: "Comércio" },
  { value: "servicos", label: "Serviços" },
  { value: "tech", label: "Tech" },
  { value: "saude", label: "Saúde" },
  { value: "educacao", label: "Educação" },
  { value: "outro", label: "Outro" },
] as const;

export const DECISION_ROLES = [
  { value: "decisor", label: "Decisor" },
  { value: "influenciador", label: "Influenciador" },
  { value: "tecnico", label: "Técnico" },
  { value: "usuario", label: "Usuário" },
] as const;

export const PROPOSAL_STATUSES = [
  { value: "rascunho", label: "Rascunho", color: "#94A3B8" },
  { value: "enviada", label: "Enviada", color: "#6366F1" },
  { value: "visualizada", label: "Visualizada", color: "#F59E0B" },
  { value: "aceita", label: "Aceita", color: "#10B981" },
  { value: "recusada", label: "Recusada", color: "#EF4444" },
  { value: "expirada", label: "Expirada", color: "#94A3B8" },
] as const;

export const PROJECT_STATUSES = [
  { value: "kickoff", label: "Kickoff", color: "#6366F1" },
  { value: "em_andamento", label: "Em andamento", color: "#0B87C3" },
  { value: "pausado", label: "Pausado", color: "#F59E0B" },
  { value: "em_revisao", label: "Em revisão", color: "#F59E0B" },
  { value: "concluido", label: "Concluído", color: "#10B981" },
  { value: "cancelado", label: "Cancelado", color: "#EF4444" },
] as const;

export const REVENUE_STATUSES = [
  { value: "pendente", label: "Pendente", color: "#F59E0B" },
  { value: "pago", label: "Pago", color: "#10B981" },
  { value: "atrasado", label: "Atrasado", color: "#EF4444" },
  { value: "cancelado", label: "Cancelado", color: "#94A3B8" },
] as const;

export const TASK_PRIORITIES = [
  { value: "baixa", label: "Baixa", color: "#10B981" },
  { value: "media", label: "Média", color: "#6366F1" },
  { value: "alta", label: "Alta", color: "#F59E0B" },
  { value: "urgente", label: "Urgente", color: "#EF4444" },
] as const;

export const PROGRAMS = [
  { value: "ai_decision_system", label: "AI Decision System" },
  { value: "ai_operations_architecture", label: "AI Operations Architecture" },
  { value: "executive_ai_enablement", label: "Executive AI Enablement" },
  { value: "ai_strategy_advisory", label: "AI Strategy Advisory" },
  { value: "ai_transformation_advisory", label: "AI Transformation Advisory" },
  { value: "consultoria", label: "Consultoria" },
  { value: "outro", label: "Outro" },
] as const;

export const PROJECT_TEMPLATES: Record<string, string[]> = {
  ai_decision_system: ["Discovery", "Coleta de Dados", "Desenvolvimento", "Validação", "Deploy", "Acompanhamento"],
  ai_operations_architecture: ["Diagnóstico", "Arquitetura", "Implementação", "Testes", "Go-live", "Suporte"],
  executive_ai_enablement: ["Assessment", "Planejamento", "Treinamento", "Implementação", "Medição"],
  ai_strategy_advisory: ["Diagnóstico", "Mapa de Oportunidades", "Roadmap", "Apresentação"],
  ai_transformation_advisory: ["Kickoff", "Ciclo Mensal", "Revisão Trimestral"],
};

export const ITEMS_PER_PAGE = 20;
