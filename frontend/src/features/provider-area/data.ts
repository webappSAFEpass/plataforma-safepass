// Dados fictícios do protótipo da área do prestador. Saem daqui quando os endpoints do
// Desafio 03 existirem (via features/provider-area/api.ts + MSW enquanto isso).
import type { Activity, Appointment, Coupon, Review, Service, TeamMember } from "./types";

export const provider = {
  name: "Dra. Marina Duarte",
  firstName: "Dra. Marina",
  specialty: "Psicologia clínica",
  title: "Psicóloga clínica",
  registry: "CRP 06/112233",
  clinic: "Clínica Equilíbrio",
  about:
    "Atendimento humanizado para adultos e adolescentes, com foco em saúde emocional e qualidade de vida.",
  phone: "(11) 99821-1144",
  email: "marina@equilibrio.com.br",
  address: "Al. Santos, 415 · São Paulo",
  website: "equilibrio.com.br",
  startingPrice: 180,
  modality: "Presencial & online",
};

export const dashboardMetrics = {
  profileVisits: 1284,
  appointments: 48,
  patientsServed: 212,
};

export const weekAgenda: Appointment[] = [
  {
    day: "Hoje",
    time: "09:00",
    service: "Consulta de psicologia",
    patient: "Renato Lima",
    status: "confirmed",
  },
  {
    day: "Hoje",
    time: "14:30",
    service: "Sessão de nutrição",
    patient: "Mariana Alves",
    status: "confirmed",
  },
  {
    day: "Amanhã",
    time: "10:00",
    service: "Avaliação postural",
    patient: "Lucas Moreira",
    status: "pending",
  },
];

export const recentActivity: Activity[] = [
  {
    kind: "review",
    title: "Nova avaliação recebida",
    note: "Camila Freire avaliou seu atendimento",
    when: "há 18 min",
  },
  { kind: "coupon", title: "Benefício utilizado", note: "BEMESTAR15 foi validado", when: "há 1h" },
  {
    kind: "appointment",
    title: "Novo agendamento",
    note: "Renato Lima confirmou consulta",
    when: "há 2h",
  },
];

export const services: Service[] = [
  {
    code: "PSI-01",
    name: "Psicoterapia individual",
    category: "Psicologia",
    durationMinutes: 50,
    price: 180,
    modality: "Atendimento presencial e online",
    available: true,
  },
  {
    code: "PSI-02",
    name: "Psicoterapia de casal",
    category: "Psicologia",
    durationMinutes: 60,
    price: 250,
    modality: "Atendimento presencial",
    available: true,
  },
  {
    code: "AVA-03",
    name: "Avaliação psicológica",
    category: "Psicologia",
    durationMinutes: 90,
    price: 320,
    modality: "Atendimento presencial",
    available: false,
  },
  {
    code: "ACO-04",
    name: "Acolhimento inicial",
    category: "Psicologia",
    durationMinutes: 30,
    price: 0,
    modality: "Online",
    available: true,
  },
];

export const team: TeamMember[] = [
  { name: "Dra. Marina Duarte", role: "Psicóloga clínica", isAdmin: true },
  { name: "Dr. Felipe Moraes", role: "Nutricionista", isAdmin: false },
  { name: "Ana Clara Ribeiro", role: "Recepcionista", isAdmin: false },
];

export const coupons: Coupon[] = [
  {
    code: "BEMESTAR15",
    label: "15% em psicoterapia",
    used: 38,
    limit: 50,
    validUntil: "2026-06-30",
  },
  {
    code: "PRIMEIRAVEZ",
    label: "R$ 30 na primeira consulta",
    used: 12,
    limit: 80,
    validUntil: "2026-07-15",
  },
];

export const couponMetrics = { usesThisMonth: 50, newPatients: 31 };

/** Código aceito pela tela de validação do protótipo (simula a resposta do backend). */
export const validRedemption = {
  code: "BEMESTAR15",
  discount: "15% de desconto",
  patient: "Camila Freire",
  service: "Psicoterapia individual",
};

export const reviews: Review[] = [
  {
    author: "Camila Freire",
    when: "há 2 dias",
    rating: 5,
    text: "A Dra. Marina foi muito acolhedora desde o primeiro contato. O consultório é tranquilo e me senti à vontade durante toda a consulta.",
  },
  {
    author: "Felipe Santos",
    when: "há 6 dias",
    rating: 5,
    text: "Excelente atendimento. A plataforma facilitou muito o uso do benefício e o agendamento foi bem rápido.",
  },
  {
    author: "Juliana Sampaio",
    when: "há 1 semana",
    rating: 4,
    text: "Profissional muito atenciosa e pontual. Recomendo para quem procura acompanhamento psicológico.",
  },
];

/** Percentual de avaliações por nota, de 5 a 1 estrela. */
export const ratingDistribution = [
  { stars: 5, share: 92 },
  { stars: 4, share: 35 },
  { stars: 3, share: 9 },
  { stars: 2, share: 3 },
  { stars: 1, share: 2 },
];
