import {
  BellRing,
  Building2,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Pill,
  ScanLine,
  Syringe,
  Star,
  Ticket,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AreaKey = "provider" | "company" | "user";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type Area = {
  key: AreaKey;
  label: string;
  home: string;
  items: NavItem[];
};

export const PROVIDER_AREA: Area = {
  key: "provider",
  label: "Área do prestador",
  home: "/prestador",
  items: [
    { label: "Meu Painel de Controle", href: "/prestador", icon: LayoutDashboard },
    { label: "Serviços", href: "/prestador/servicos", icon: HeartPulse },
    { label: "Equipe", href: "/prestador/equipe", icon: UsersRound },
    { label: "Benefícios", href: "/prestador/beneficios", icon: Ticket },
    { label: "Validar Benefício", href: "/prestador/validar-beneficio", icon: ScanLine },
    { label: "Avaliações", href: "/prestador/avaliacoes", icon: Star, badge: "3" },
  ],
};

export const COMPANY_AREA: Area = {
  key: "company",
  label: "Área da empresa",
  home: "/empresa",
  items: [
    { label: "Meu Painel de Controle", href: "/empresa", icon: Building2 },
    { label: "Colaboradores", href: "/empresa/colaboradores", icon: UsersRound },
    { label: "Benefícios", href: "/empresa/beneficios", icon: HeartPulse },
    { label: "Atestados", href: "/empresa/atestados", icon: FileText, badge: "4" },
  ],
};

/** Área do usuário final: histórico médico do Squad 44 (Desafio 04). */
export const USER_AREA: Area = {
  key: "user",
  label: "Histórico médico",
  home: "/historico-medico",
  items: [
    { label: "Visão geral", href: "/historico-medico", icon: ClipboardList },
    { label: "Documentos", href: "/historico-medico/documentos", icon: FileText },
    { label: "Medicamentos", href: "/historico-medico/medicamentos", icon: Pill },
    { label: "Vacinas", href: "/historico-medico/vacinas", icon: Syringe },
    { label: "Lembretes", href: "/historico-medico/lembretes", icon: BellRing },
  ],
};

export function areaFor(pathname: string): Area {
  if (pathname.startsWith(USER_AREA.home)) return USER_AREA;
  return pathname.startsWith(COMPANY_AREA.home) ? COMPANY_AREA : PROVIDER_AREA;
}

/** O item do painel só fica ativo na própria rota; os demais também nas sub-rotas. */
export function isActive(item: NavItem, area: Area, pathname: string): boolean {
  if (item.href === area.home) return pathname === area.home;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
