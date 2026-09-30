// Contratos compartilhados com o backend SAFEpass (FastAPI) — JSON em camelCase.

export type PlanId = "free" | "aura" | "aura_plus";

export type Intent =
  | "duvida_plataforma"
  | "consulta_conta"
  | "consulta_dependentes"
  | "consulta_documentos"
  | "busca_prestadores"
  | "fallback_whatsapp"
  | "conversa_geral";

export interface Provider {
  id: string;
  nome: string;
  categoria: string;
  registroProfissional: string | null;
  descricao: string | null;
  tags: string[];
  modalidade: string | null;
  localizacao: string | null;
  faixaPreco: string | null;
  avaliacao: number | null;
  qtdAvaliacoes: number | null;
  telefone: string | null;
}

export interface DocumentItem {
  id: string;
  titularId: string;
  titularNome: string;
  tipo: string;
  validade: string | null;
  status: "valido" | "vencendo" | "vencido";
}

export type Card =
  | { type: "providers"; data: Provider[]; total: number }
  | { type: "documents"; data: DocumentItem[] }
  | { type: "whatsapp"; data: { withinHours: boolean; link?: string | null; message: string } }
  | { type: "consent"; data: { message: string } };

export interface ApiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatDebug {
  intent: Intent;
  toolCalls: { name: string; args: Record<string, unknown> }[];
  latencyMs: number;
}

export interface ChatResponse {
  reply: string;
  cards: Card[];
  debug: ChatDebug;
}
