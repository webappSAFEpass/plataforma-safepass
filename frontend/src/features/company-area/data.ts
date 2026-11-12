// Dados fictícios do protótipo da área da empresa. Saem daqui quando os endpoints do
// Desafio 03 existirem (via features/company-area/api.ts + MSW enquanto isso).
import type { Certificate, Employee } from "./types";

export const companyMetrics = {
  enrolledEmployees: 137,
  seatLimit: 150,
  awaitingInvite: 12,
  newLastMonth: 24,
  appointmentsThisMonth: 226,
  certificatesToReview: 4,
  networkProviders: 2400,
  renewal: "Jan/27",
};

/** Engajamento mensal (% de colaboradores que usaram o benefício). */
export const engagementByMonth = [
  { label: "Abr", value: 42 },
  { label: "Mai", value: 55 },
  { label: "Jun", value: 49 },
  { label: "Jul", value: 67 },
  { label: "Ago", value: 72 },
  { label: "Set", value: 88 },
];

export const employees: Employee[] = [
  {
    name: "André Martins",
    area: "Operações",
    email: "andre.martins@veredas.com",
    status: "active",
  },
  {
    name: "Bianca Rocha",
    area: "Pessoas & Cultura",
    email: "bianca.rocha@veredas.com",
    status: "active",
  },
  { name: "Caio Nunes", area: "Tecnologia", email: "caio.nunes@veredas.com", status: "invited" },
  {
    name: "Fernanda Lima",
    area: "Financeiro",
    email: "fernanda.lima@veredas.com",
    status: "active",
  },
];

export const certificates: Certificate[] = [
  {
    fileName: "Atestado_Joana_Silva.pdf",
    employee: "Joana Silva",
    area: "Operações",
    receivedAt: "2026-09-22",
    status: "review",
  },
  {
    fileName: "Declaração_Ana_Paula.pdf",
    employee: "Ana Paula",
    area: "Comercial",
    receivedAt: "2026-09-22",
    status: "organized",
  },
  {
    fileName: "Atestado_Caio_Nunes.pdf",
    employee: "Caio Nunes",
    area: "Tecnologia",
    receivedAt: "2026-09-20",
    status: "organized",
  },
  {
    fileName: "Declaração_Paulo_Amaral.pdf",
    employee: "Paulo Amaral",
    area: "Financeiro",
    receivedAt: "2026-09-18",
    status: "organized",
  },
];
