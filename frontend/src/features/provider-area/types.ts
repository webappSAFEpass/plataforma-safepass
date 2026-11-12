// Formatos locais enquanto o módulo `providers`/`coupons`/`reviews` do backend (Desafio 03) não
// publica o contrato. Quando existir, troque por tipos derivados de lib/api/schema.d.ts.

export type AppointmentStatus = "confirmed" | "pending";

export type Appointment = {
  day: "Hoje" | "Amanhã";
  time: string;
  service: string;
  patient: string;
  status: AppointmentStatus;
};

export type ActivityKind = "review" | "coupon" | "appointment";

export type Activity = {
  kind: ActivityKind;
  title: string;
  note: string;
  when: string;
};

export type Service = {
  code: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: number;
  modality: string;
  available: boolean;
};

export type TeamMember = {
  name: string;
  role: string;
  isAdmin: boolean;
};

export type Coupon = {
  code: string;
  label: string;
  used: number;
  limit: number;
  validUntil: string;
};

export type Review = {
  author: string;
  when: string;
  rating: number;
  text: string;
};
