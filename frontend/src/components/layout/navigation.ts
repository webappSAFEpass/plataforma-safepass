import {
  Building2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  ScanLine,
  Star,
  Ticket,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AreaKey = "provider" | "company";

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

export function areaFor(pathname: string): Area {
  return pathname.startsWith(COMPANY_AREA.home) ? COMPANY_AREA : PROVIDER_AREA;
}

/** O item do painel só fica ativo na própria rota; os demais também nas sub-rotas. */
export function isActive(item: NavItem, area: Area, pathname: string): boolean {
  if (item.href === area.home) return pathname === area.home;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
