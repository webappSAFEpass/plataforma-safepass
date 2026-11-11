import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  Globe2,
  HeartPulse,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Phone,
  Plus,
  Quote,
  Save,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Upload,
  UserCog,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

const avatar =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=240&q=80";

type Mode = "provider" | "company";
type Screen =
  | "dashboard"
  | "profile"
  | "services"
  | "team"
  | "coupons"
  | "validate"
  | "reviews"
  | "company"
  | "employees"
  | "benefits"
  | "certificates";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  screen: Screen;
  badge?: string;
};

const providerNavigation: NavItem[] = [
  { label: "Meu Painel de Controle", href: "/", icon: LayoutDashboard, screen: "dashboard" },
  { label: "Serviços", href: "/servicos", icon: HeartPulse, screen: "services" },
  { label: "Equipe", href: "/equipe", icon: UsersRound, screen: "team" },
  { label: "Benefícios", href: "/cupons", icon: Ticket, screen: "coupons" },
  { label: "Validar Benefício", href: "/validar-cupom", icon: ScanLine, screen: "validate" },
  { label: "Avaliações", href: "/avaliacoes", icon: Star, screen: "reviews", badge: "3" },
];

const companyNavigation: NavItem[] = [
  { label: "Meu Painel de Controle", href: "/empresa", icon: Building2, screen: "company" },
  { label: "Colaboradores", href: "/colaboradores", icon: UsersRound, screen: "employees" },
  { label: "Benefícios", href: "/beneficios", icon: HeartPulse, screen: "benefits" },
  { label: "Atestados", href: "/atestados", icon: FileText, screen: "certificates", badge: "4" },
];

const titles: Record<Screen, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "ÁREA DO PRESTADOR",
    title: "Bom dia, Dra. Marina",
    description: "Aqui está um resumo da sua presença na SAFEpass.",
  },
  profile: {
    eyebrow: "CADASTRO DO PRESTADOR",
    title: "Meu perfil",
    description: "Mantenha os dados da sua clínica sempre atualizados.",
  },
  services: {
    eyebrow: "CATÁLOGO DE SERVIÇOS",
    title: "Serviços oferecidos",
    description: "Gerencie os serviços disponíveis para beneficiários SAFEpass.",
  },
  team: {
    eyebrow: "GESTÃO DE EQUIPE",
    title: "Sua equipe",
    description: "Profissionais vinculados à Clínica Equilíbrio.",
  },
  coupons: {
    eyebrow: "GESTÃO DE BENEFÍCIOS",
    title: "Benefícios de desconto",
    description: "Crie incentivos exclusivos e acompanhe seus resgates.",
  },
  validate: {
    eyebrow: "VALIDAÇÃO RÁPIDA",
    title: "Validar benefício",
    description: "Confirme o benefício apresentado antes de concluir o atendimento.",
  },
  reviews: {
    eyebrow: "EXPERIÊNCIA DO PACIENTE",
    title: "Avaliações recebidas",
    description: "Acompanhe o que os clientes dizem sobre o seu atendimento.",
  },
  company: {
    eyebrow: "ÁREA DA EMPRESA",
    title: "Olá, Grupo Veredas",
    description: "Acompanhe a saúde e os benefícios do seu time.",
  },
  employees: {
    eyebrow: "GESTÃO DE PESSOAS",
    title: "Colaboradores",
    description: "Organize quem tem acesso aos benefícios SAFEpass.",
  },
  benefits: {
    eyebrow: "BENEFÍCIOS CORPORATIVOS",
    title: "Programa SAFEpass",
    description: "Visibilidade para o bem-estar que sua empresa oferece.",
  },
  certificates: {
    eyebrow: "SAÚDE OCUPACIONAL",
    title: "Atestados médicos",
    description: "Envie, acompanhe e mantenha os documentos organizados.",
  },
};

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5" aria-label="SAFEpass">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#3f6886] text-white shadow-[0_8px_20px_rgba(63,104,134,.18)]">
        <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
      </div>
      <span className="font-display text-[21px] font-extrabold tracking-[-.07em] text-[#3f6886]">
        SAFE<span className="font-semibold text-[#3f6886]">pass</span>
      </span>
    </div>
  );
}

function Avatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-[86px] w-[86px]" };
  return <img src={avatar} alt="Dra. Marina Duarte" className={cx(sizes[size], "rounded-full object-cover ring-2 ring-white")} />;
}

function PrimaryButton({ children, className, onClick, type = "button" }: { children: React.ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} className={cx("inline-flex items-center justify-center gap-2 rounded-xl bg-[#3f6886] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(63,104,134,.16)] transition duration-150 hover:bg-[#3f6886] active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6886]", className)}>
      {children}
    </button>
  );
}

function OutlineButton({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cx("inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-bold text-[#3f6886] transition duration-150 hover:border-[#e5e7eb] hover:bg-[#d1f0e3] active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3f6886]", className)}>
      {children}
    </button>
  );
}

function Panel({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={cx("rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_12px_32px_rgba(63,104,134,.045)]", className)}>{children}</section>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">{children}</label>;
}

function Field({ label, value, icon: Icon, placeholder }: { label: string; value?: string; icon?: typeof Mail; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3f6886]" />}
        <input defaultValue={value} placeholder={placeholder} className={cx("h-11 w-full rounded-xl border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm font-medium text-[#3f6886] outline-none transition focus:border-[#e5e7eb] focus:bg-white focus:ring-4 focus:ring-[#d6e8f6]/15", Icon && "pl-9")} />
      </div>
    </div>
  );
}

function PageHeading({ screen, action }: { screen: Screen; action?: React.ReactNode }) {
  const content = titles[screen];
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.16em] text-[#3f6886]">{content.eyebrow}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.055em] text-[#3f6886] sm:text-[34px]">{content.title}</h1>
        <p className="mt-2 text-sm font-medium text-[#3f6886]">{content.description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Metric({ icon: Icon, label, value, foot, color = "green" }: { icon: typeof HeartPulse; label: string; value: string; foot: string; color?: "green" | "lime" | "amber" | "blue" }) {
  const colors = {
    green: "bg-[#d6e8f6] text-[#3f6886]",
    lime: "bg-[#d6e8f6] text-[#3f6886]",
    amber: "bg-[#fff5b2] text-[#f59f0c]",
    blue: "bg-[#d6e8f6] text-[#3f6886]",
  };
  return (
    <Panel className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className={cx("grid h-9 w-9 place-items-center rounded-xl", colors[color])}><Icon className="h-[18px] w-[18px]" /></div>
        <ArrowUpRight className="h-4 w-4 text-[#3f6886]" />
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-[-.05em] text-[#3f6886]">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#3f6886]">{foot}</p>
    </Panel>
  );
}

function ProviderDashboard({ go }: { go: (path: string) => void }) {
  const activities = [
    ["Nova avaliação recebida", "Camila Freire avaliou seu atendimento", "há 18 min", Star, "bg-[#fff5b2] text-[#f59f0c]"],
    ["Benefício utilizado", "BEMESTAR15 foi validado", "há 1h", Ticket, "bg-[#d1f0e3] text-[#2f9e5c]"],
    ["Novo agendamento", "Renato Lima confirmou consulta", "há 2h", CalendarDays, "bg-[#d6e8f6] text-[#3f6886]"],
  ] as const;
  return (
    <>
      <PageHeading screen="dashboard" />
      <section className="relative mb-5 overflow-hidden rounded-[22px] bg-[#3f6886] px-6 py-6 text-white shadow-[0_18px_40px_rgba(63,104,134,.2)] sm:px-7">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d6e8f6]/15 blur-2xl" />
        <div className="absolute bottom-[-80px] right-[20%] h-48 w-48 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-[#e5e7eb]">
              <Sparkles className="h-3.5 w-3.5 text-[#d6e8f6]" /> PERFIL EM DESTAQUE
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-[-.05em] sm:text-[28px]">Sua clínica está pronta para ser encontrada.</h2>
            <p className="mt-2 max-w-lg text-sm font-medium leading-6 text-[#e5e7eb]">Complete a galeria do espaço e aumente a confiança de novos pacientes.</p>
            <button onClick={() => go("/perfil")} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#d6e8f6] transition hover:text-white"><Pencil className="h-4 w-4" /> Completar meu perfil</button>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#3f6886]/60 px-5 py-4 backdrop-blur-sm">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full" style={{ background: "conic-gradient(#d6e8f6 0 82%, rgba(255,255,255,.14) 82% 100%)" }}>
              <div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[#3f6886] font-display text-xl font-extrabold">82%</div>
            </div>
            <div><p className="text-sm font-bold">Perfil completo</p><p className="mt-1 text-xs text-[#e5e7eb]">Faltam apenas 2 itens</p></div>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric icon={Search} label="Visitas no perfil" value="1.284" foot="+12% este mês" color="green" />
        <Metric icon={CalendarDays} label="Agendamentos" value="48" foot="+8 esta semana" color="lime" />
        <Metric icon={Star} label="Avaliação média" value="4,9" foot="36 avaliações" color="amber" />
        <Metric icon={HeartPulse} label="Pacientes atendidos" value="212" foot="+18% no período" color="blue" />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <Panel className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Sua semana</h3><p className="mt-1 text-xs font-medium text-[#3f6886]">Agenda e oportunidades recentes</p></div><button className="text-xs font-extrabold text-[#3f6886] hover:text-[#3f6886]">Ver agenda</button></div>
          <div className="grid gap-2">
            {[
              ["Hoje", "09:00", "Consulta de psicologia", "Renato Lima", "Confirmado"],
              ["Hoje", "14:30", "Sessão de nutrição", "Mariana Alves", "Confirmado"],
              ["Amanhã", "10:00", "Avaliação postural", "Lucas Moreira", "Pendente"],
            ].map(([date, time, service, person, status]) => (
              <div key={`${time}-${person}`} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] p-3 transition hover:border-[#e5e7eb] hover:bg-[#ffffff]">
                <div className="w-10 text-center"><p className="text-[10px] font-extrabold uppercase text-[#3f6886]">{date}</p><p className="font-display text-sm font-extrabold text-[#3f6886]">{time}</p></div>
                <div className="h-9 w-px bg-[#e5e7eb]" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#3f6886]">{service}</p><p className="mt-0.5 text-xs text-[#3f6886]">{person}</p></div>
                <span className={cx("hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:block", status === "Confirmado" ? "bg-[#d1f0e3] text-[#2f9e5c]" : "bg-[#fff5b2] text-[#f59f0c]")}>{status}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Atividade recente</h3><Bell className="h-4 w-4 text-[#3f6886]" /></div>
          <div className="space-y-5">
            {activities.map(([title, note, time, Icon, iconStyle]) => (
              <div key={title} className="flex gap-3"><div className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-lg", iconStyle)}><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="flex justify-between gap-3"><p className="text-sm font-bold text-[#3f6886]">{title}</p><span className="whitespace-nowrap text-[10px] font-semibold text-[#3f6886]">{time}</span></div><p className="mt-1 text-xs leading-5 text-[#3f6886]">{note}</p></div></div>
            ))}
          </div>
          <button className="mt-5 w-full border-t border-[#e5e7eb] pt-4 text-xs font-extrabold text-[#3f6886] hover:text-[#3f6886]">Ver todas as notificações</button>
        </Panel>
      </section>
    </>
  );
}

function ProfileView() {
  return (
    <>
      <PageHeading screen="profile" action={<PrimaryButton onClick={() => toast.success("Alterações salvas com sucesso") }><Save className="h-4 w-4" /> Salvar alterações</PrimaryButton>} />
      <Panel className="mb-5 overflow-hidden">
        <div className="relative h-[118px] bg-[#3f6886]"><div className="absolute -right-6 -top-10 h-44 w-44 rounded-full border-[22px] border-[#d6e8f6]/15" /><div className="absolute bottom-0 left-0 h-1 w-40 bg-[#d6e8f6]" /></div>
        <div className="relative flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
          <div className="-mt-11 shrink-0 rounded-full bg-white p-1.5 shadow-lg"><Avatar size="lg" /></div>
          <div className="pb-0 sm:pb-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-extrabold tracking-[-.05em] text-[#3f6886]">Dra. Marina Duarte</h2><span className="inline-flex items-center gap-1 rounded-full bg-[#d1f0e3] px-2 py-1 text-[10px] font-extrabold text-[#3f6886]"><BadgeCheck className="h-3.5 w-3.5" /> PERFIL VERIFICADO</span></div><p className="mt-1 text-sm font-medium text-[#3f6886]">Psicóloga clínica · CRP 06/112233</p></div>
          <button className="sm:mb-1 sm:ml-auto inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-extrabold text-[#3f6886] hover:bg-[#ffffff]"><Upload className="h-4 w-4" /> Alterar foto</button>
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Panel className="p-5 sm:p-6">
          <div className="mb-6 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d1f0e3] text-[#3f6886]"><UserRound className="h-4 w-4" /></div><div><h3 className="font-display font-extrabold tracking-[-.04em] text-[#3f6886]">Informações públicas</h3><p className="text-xs text-[#3f6886]">O que pacientes veem no seu perfil.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome de exibição" value="Dra. Marina Duarte" /><Field label="Especialidade" value="Psicologia clínica" /><div className="sm:col-span-2"><Label>Sobre a profissional</Label><textarea defaultValue="Atendimento humanizado para adultos e adolescentes, com foco em saúde emocional e qualidade de vida." className="min-h-[110px] w-full resize-none rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-3 text-sm font-medium leading-6 text-[#3f6886] outline-none transition focus:border-[#e5e7eb] focus:bg-white focus:ring-4 focus:ring-[#d6e8f6]/15" /></div><Field label="Clínica / consultório" value="Clínica Equilíbrio" /><Field label="Registro profissional" value="CRP 06/112233" /></div>
        </Panel>
        <div className="space-y-5">
          <Panel className="p-5 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d1f0e3] text-[#3f6886]"><Phone className="h-4 w-4" /></div><div><h3 className="font-display font-extrabold tracking-[-.04em] text-[#3f6886]">Contato e endereço</h3><p className="text-xs text-[#3f6886]">Informações para agendamento.</p></div></div><div className="space-y-4"><Field label="Telefone" value="(11) 99821-1144" icon={Phone} /><Field label="E-mail" value="marina@equilibrio.com.br" icon={Mail} /><Field label="Endereço" value="Al. Santos, 415 · São Paulo" icon={MapPin} /><Field label="Site" value="equilibrio.com.br" icon={Globe2} /></div></Panel>
          <Panel className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display font-extrabold tracking-[-.04em] text-[#3f6886]">Valores e atendimento</h3><p className="mt-1 text-xs text-[#3f6886]">Exibidos no catálogo SAFEpass.</p></div><Pencil className="h-4 w-4 text-[#3f6886]" /></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#d1f0e3] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">Consulta a partir de</p><p className="mt-1 font-display text-xl font-extrabold text-[#3f6886]">R$ 180</p></div><div className="rounded-xl bg-[#d1f0e3] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">Modalidade</p><p className="mt-1 text-sm font-bold text-[#3f6886]">Presencial & online</p></div></div></Panel>
        </div>
      </div>
    </>
  );
}

function ServicesView() {
  const [active, setActive] = useState<Record<string, boolean>>({ "Psicoterapia individual": true, "Psicoterapia de casal": true, "Avaliação psicológica": false, "Acolhimento inicial": true });
  const services = [
    ["Psicoterapia individual", "Psicologia", "50 min", "R$ 180", "Atendimento presencial e online"],
    ["Psicoterapia de casal", "Psicologia", "60 min", "R$ 250", "Atendimento presencial"],
    ["Avaliação psicológica", "Psicologia", "90 min", "R$ 320", "Atendimento presencial"],
    ["Acolhimento inicial", "Psicologia", "30 min", "Sem custo", "Online"],
  ];
  return (
    <>
      <PageHeading screen="services" action={<PrimaryButton onClick={() => toast("Solicitação enviada", { description: "Vamos analisar a inclusão do novo serviço." })}><Plus className="h-4 w-4" /> Solicitar serviço</PrimaryButton>} />
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#e5e7eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Tabela padrão SAFEpass</h3><p className="mt-1 text-xs font-medium text-[#3f6886]">Ative os serviços que sua clínica oferece.</p></div><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3f6886]" /><input placeholder="Buscar serviço" className="h-10 rounded-xl border border-[#e5e7eb] bg-[#ffffff] pl-9 pr-3 text-sm outline-none focus:border-[#e5e7eb] focus:ring-4 focus:ring-[#d6e8f6]/15" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[#e5e7eb] bg-[#ffffff] text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]"><th className="px-6 py-3.5">Serviço</th><th className="px-3 py-3.5">Categoria</th><th className="px-3 py-3.5">Duração</th><th className="px-3 py-3.5">Valor</th><th className="px-3 py-3.5">Modalidade</th><th className="px-6 py-3.5 text-right">Disponível</th></tr></thead><tbody>{services.map(([name, category, duration, price, modality]) => <tr key={name} className="border-b border-[#e5e7eb] last:border-none transition hover:bg-[#ffffff]"><td className="px-6 py-4"><p className="text-sm font-bold text-[#3f6886]">{name}</p><p className="mt-1 text-xs text-[#3f6886]">Código {name.slice(0, 3).toUpperCase()}-0{services.indexOf(services.find((s) => s[0] === name)!) + 1}</p></td><td className="px-3 py-4 text-sm font-medium text-[#3f6886]">{category}</td><td className="px-3 py-4 text-sm font-medium text-[#3f6886]">{duration}</td><td className="px-3 py-4 text-sm font-extrabold text-[#3f6886]">{price}</td><td className="px-3 py-4"><span className="rounded-full bg-[#ffffff] px-2.5 py-1 text-[10px] font-extrabold text-[#3f6886]">{modality}</span></td><td className="px-6 py-4 text-right"><button onClick={() => setActive((state) => ({ ...state, [name]: !state[name] }))} className={cx("relative h-6 w-11 rounded-full transition", active[name] ? "bg-[#3f6886]" : "bg-[#e5e7eb]")} aria-label={`Alterar disponibilidade de ${name}`}><span className={cx("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition", active[name] ? "left-6" : "left-1")} /></button></td></tr>)}</tbody></table></div>
      </Panel>
      <div className="mt-5 rounded-2xl border border-dashed border-[#e5e7eb] bg-[#d1f0e3] p-5 sm:flex sm:items-center sm:justify-between"><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#3f6886] shadow-sm"><Plus className="h-5 w-5" /></div><div><h3 className="font-display font-extrabold tracking-[-.04em] text-[#3f6886]">Não encontrou o serviço que oferece?</h3><p className="mt-1 text-xs leading-5 text-[#3f6886]">Solicite a inclusão de um procedimento para avaliação do time SAFEpass.</p></div></div><button onClick={() => toast("Solicitação iniciada")} className="mt-4 text-sm font-extrabold text-[#3f6886] sm:mt-0">Fazer solicitação <ArrowUpRight className="ml-1 inline h-4 w-4" /></button></div>
    </>
  );
}

function TeamView() {
  const [team, setTeam] = useState([
    { name: "Dra. Marina Duarte", role: "Psicóloga clínica", initials: "MD", tone: "bg-[#d6e8f6] text-[#3f6886]", status: "Administradora" },
    { name: "Dr. Felipe Moraes", role: "Nutricionista", initials: "FM", tone: "bg-[#ffffff] text-[#3f6886]", status: "Ativo" },
    { name: "Ana Clara Ribeiro", role: "Recepcionista", initials: "AC", tone: "bg-[#ffffff] text-[#3f6886]", status: "Ativo" },
  ]);
  return (
    <>
      <PageHeading screen="team" action={<PrimaryButton onClick={() => toast("Convite preparado", { description: "O link de convite foi copiado para a área de transferência." })}><UserPlus className="h-4 w-4" /> Convidar profissional</PrimaryButton>} />
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Panel className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Profissionais vinculados</h3><p className="mt-1 text-xs font-medium text-[#3f6886]">{team.length} pessoas com acesso à clínica.</p></div><button className="rounded-lg p-2 text-[#3f6886] hover:bg-[#ffffff]"><MoreHorizontal className="h-5 w-5" /></button></div><div className="space-y-3">{team.map((person) => <div key={person.name} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] p-3.5 transition hover:border-[#e5e7eb] hover:bg-[#ffffff]"><div className={cx("grid h-10 w-10 place-items-center rounded-full text-xs font-extrabold", person.tone)}>{person.initials}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-[#3f6886]">{person.name}</p>{person.name === "Dra. Marina Duarte" && <ShieldCheck className="h-4 w-4 shrink-0 text-[#3f6886]" />}</div><p className="mt-0.5 text-xs text-[#3f6886]">{person.role}</p></div><span className={cx("hidden rounded-full px-2 py-1 text-[10px] font-extrabold sm:block", person.status === "Administradora" ? "bg-[#d6e8f6] text-[#3f6886]" : "bg-[#d1f0e3] text-[#3f6886]")}>{person.status}</span><button onClick={() => { if (person.status === "Administradora") return toast.error("A administradora principal não pode ser removida."); setTeam((current) => current.filter((item) => item.name !== person.name)); toast.success("Profissional removido da equipe."); }} className="rounded-lg p-2 text-[#3f6886] transition hover:bg-[#eb9180] hover:text-[#e92423]" aria-label={`Remover ${person.name}`}><Trash2 className="h-4 w-4" /></button></div>)}</div></Panel>
        <div className="space-y-5"><Panel className="overflow-hidden"><div className="bg-[#3f6886] p-5 text-white"><div className="mb-6 grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#d6e8f6]"><UserPlus className="h-5 w-5" /></div><h3 className="font-display text-lg font-extrabold tracking-[-.04em]">Amplie sua equipe</h3><p className="mt-2 text-xs leading-5 text-[#e5e7eb]">Convide profissionais e mantenha a agenda da sua clínica integrada.</p></div><div className="p-5"><p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#3f6886]">Como funciona</p><ol className="mt-4 space-y-4">{["Envie o convite por e-mail", "Profissional completa o cadastro", "Defina os serviços disponíveis"].map((item, index) => <li key={item} className="flex gap-3 text-sm font-semibold text-[#3f6886]"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#d1f0e3] text-[10px] font-extrabold text-[#3f6886]">{index + 1}</span>{item}</li>)}</ol><OutlineButton className="mt-5 w-full" onClick={() => toast("Convite preparado")}><Mail className="h-4 w-4" /> Enviar convite</OutlineButton></div></Panel><Panel className="p-5"><p className="text-xs font-bold text-[#3f6886]">Precisa de ajuda com permissões?</p><button className="mt-2 text-sm font-extrabold text-[#3f6886]">Conheça os níveis de acesso <ArrowUpRight className="inline h-4 w-4" /></button></Panel></div>
      </section>
    </>
  );
}

function CouponsView() {
  const [couponCreated, setCouponCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const coupons = useMemo(() => [{ code: "BEMESTAR15", label: "15% em psicoterapia", used: 38, total: 50, until: "30 jun 2026", active: true }, { code: "PRIMEIRAVEZ", label: "R$ 30 na primeira consulta", used: 12, total: 80, until: "15 jul 2026", active: true }, ...(couponCreated ? [{ code: "EQUILIBRIO20", label: "20% em atendimento", used: 0, total: 100, until: "31 jul 2026", active: true }] : [])], [couponCreated]);
  return (
    <>
      <PageHeading screen="coupons" action={<PrimaryButton onClick={() => document.getElementById("coupon-form")?.scrollIntoView({ behavior: "smooth" })}><Plus className="h-4 w-4" /> Criar novo benefício</PrimaryButton>} />
      <section className="grid gap-4 md:grid-cols-3"><Metric icon={Ticket} label="Benefícios ativos" value={couponCreated ? "3" : "2"} foot="Disponíveis agora" color="lime" /><Metric icon={CheckCircle2} label="Usos no mês" value="50" foot="+22% vs. mês anterior" color="green" /><Metric icon={HeartPulse} label="Novos pacientes" value="31" foot="Vieram por benefícios" color="blue" /></section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <Panel className="p-5 sm:p-6"><div className="mb-5"><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Benefícios em circulação</h3><p className="mt-1 text-xs text-[#3f6886]">Acompanhe o desempenho de cada benefício.</p></div><div className="space-y-3">{coupons.map((coupon) => <div key={coupon.code} className="relative overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-4"><div className="absolute bottom-0 left-0 top-0 w-1 bg-[#3f6886]" /><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d1f0e3] text-[#3f6886]"><Ticket className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="font-display text-sm font-extrabold tracking-[-.02em] text-[#3f6886]">{coupon.code}</p><p className="mt-0.5 text-xs text-[#3f6886]">{coupon.label}</p></div><button onClick={() => { setCopied(true); navigator.clipboard?.writeText(coupon.code); toast.success("Código copiado"); setTimeout(() => setCopied(false), 1500); }} className="rounded-lg p-1.5 text-[#3f6886] hover:bg-[#d1f0e3] hover:text-[#3f6886]" aria-label="Copiar código"><Copy className="h-4 w-4" /></button></div><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]"><div className="h-full rounded-full bg-[#3f6886]" style={{ width: `${(coupon.used / coupon.total) * 100}%` }} /></div><span className="text-[10px] font-extrabold text-[#3f6886]">{coupon.used}/{coupon.total} usos</span></div><div className="mt-2 flex justify-between text-[10px] font-semibold text-[#3f6886]"><span>Válido até {coupon.until}</span><span className="text-[#3f6886]">Ativo</span></div></div></div></div>)}</div></Panel>
        <Panel className="p-5 sm:p-6" id="coupon-form"><div className="mb-5 flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d1f0e3] text-[#3f6886]"><Plus className="h-4 w-4" /></div><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Novo benefício</h3><p className="text-xs text-[#3f6886]">Defina regras e validade.</p></div></div><form onSubmit={(event) => { event.preventDefault(); setCouponCreated(true); toast.success("Benefício criado e pronto para divulgar."); }} className="space-y-4"><Field label="Código do benefício" value="EQUILIBRIO20" /><div className="grid grid-cols-2 gap-3"><Field label="Tipo de desconto" value="Percentual" /><Field label="Valor" value="20%" /></div><Field label="Serviço aplicável" value="Todos os serviços" /><div className="grid grid-cols-2 gap-3"><Field label="Validade" value="31/07/2026" /><Field label="Limite de usos" value="100" /></div><div className="rounded-xl bg-[#d1f0e3] p-3 text-xs leading-5 text-[#3f6886]"><CircleAlert className="mr-1 inline h-3.5 w-3.5 text-[#3f6886]" />O desconto será aplicado apenas para pacientes elegíveis SAFEpass.</div><PrimaryButton className="w-full" type="submit"><Check className="h-4 w-4" /> Criar benefício</PrimaryButton></form></Panel>
      </section>
      {copied && <span className="sr-only">Código copiado</span>}
    </>
  );
}

function ValidationView() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<"idle" | "valid" | "invalid">("idle");
  const validate = (event?: React.FormEvent) => { event?.preventDefault(); setResult(code.trim().toUpperCase() === "BEMESTAR15" ? "valid" : "invalid"); };
  return (
    <>
      <PageHeading screen="validate" />
      <section className="mx-auto max-w-3xl"><Panel className="relative overflow-hidden p-6 sm:p-10"><div className="absolute -right-24 -top-24 h-60 w-60 rounded-full bg-[#d6e8f6]/15 blur-2xl" /><div className="relative"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#d1f0e3] text-[#3f6886]"><ScanLine className="h-8 w-8" /></div><div className="mx-auto mt-5 max-w-md text-center"><h2 className="font-display text-2xl font-extrabold tracking-[-.05em] text-[#3f6886]">Validar benefício</h2><p className="mt-2 text-sm leading-6 text-[#3f6886]">Digite o código apresentado pelo paciente. A validação é instantânea e registra um único uso.</p></div><form onSubmit={validate} className="mx-auto mt-8 max-w-lg"><Label>Código do benefício</Label><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Ticket className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3f6886]" /><input value={code} onChange={(event) => { setCode(event.target.value.toUpperCase()); setResult("idle"); }} placeholder="Ex.: BEMESTAR15" className="h-14 w-full rounded-xl border border-[#e5e7eb] bg-[#ffffff] pl-11 pr-4 font-display text-base font-extrabold tracking-[.08em] text-[#3f6886] outline-none transition placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:tracking-normal focus:border-[#e5e7eb] focus:bg-white focus:ring-4 focus:ring-[#d6e8f6]/15" /><span className="sr-only">Digite BEMESTAR15 para testar uma validação bem-sucedida</span></div><PrimaryButton className="h-14 px-6" type="submit">Validar</PrimaryButton></div></form>{result !== "idle" && <div className={cx("mx-auto mt-6 max-w-lg rounded-xl border p-4", result === "valid" ? "border-[#e5e7eb] bg-[#ffffff]" : "border-[#e5e7eb] bg-[#eb9180]")}><div className="flex gap-3"><div className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", result === "valid" ? "bg-[#ffffff] text-white" : "bg-[#eb9180] text-white")}>{result === "valid" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}</div><div>{result === "valid" ? <><p className="text-sm font-extrabold text-[#3f6886]">Benefício válido — 15% de desconto</p><p className="mt-1 text-xs leading-5 text-[#3f6886]">Paciente: Camila Freire · Psicoterapia individual · 1 uso será registrado.</p><button onClick={() => { toast.success("Uso confirmado com sucesso."); setCode(""); setResult("idle"); }} className="mt-3 text-xs font-extrabold text-[#3f6886]">Confirmar uso <Check className="ml-1 inline h-3.5 w-3.5" /></button></> : <><p className="text-sm font-extrabold text-[#e92423]">Não foi possível validar este código</p><p className="mt-1 text-xs leading-5 text-[#e92423]">Confira se o código foi digitado corretamente, se ainda está válido ou se já foi utilizado.</p></>}</div></div></div>}<p className="mt-8 text-center text-xs text-[#3f6886]"><ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-[#3f6886]" /> Dados protegidos e registro seguro pela SAFEpass</p></div></Panel><div className="mt-5 flex justify-center gap-8 text-xs font-semibold text-[#3f6886]"><span><Clock3 className="mr-1.5 inline h-4 w-4 text-[#3f6886]" />Validação em segundos</span><span><HelpCircle className="mr-1.5 inline h-4 w-4 text-[#3f6886]" />Precisa de ajuda?</span></div></section>
    </>
  );
}

function ReviewsView() {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const reviews = [{ name: "Camila Freire", initials: "CF", date: "há 2 dias", rating: 5, text: "A Dra. Marina foi muito acolhedora desde o primeiro contato. O consultório é tranquilo e me senti à vontade durante toda a consulta.", color: "bg-[#d1f0e3] text-[#3f6886]" }, { name: "Felipe Santos", initials: "FS", date: "há 6 dias", rating: 5, text: "Excelente atendimento. A plataforma facilitou muito o uso do benefício e o agendamento foi bem rápido.", color: "bg-[#d1f0e3] text-[#3f6886]" }, { name: "Juliana Sampaio", initials: "JS", date: "há 1 semana", rating: 4, text: "Profissional muito atenciosa e pontual. Recomendo para quem procura acompanhamento psicológico.", color: "bg-[#eb9180] text-[#e92423]" }];
  return (
    <>
      <PageHeading screen="reviews" />
      <section className="mb-5 grid gap-4 md:grid-cols-[.8fr_1.2fr]"><Panel className="p-6"><p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#3f6886]">Nota geral</p><div className="mt-2 flex items-end gap-3"><span className="font-display text-5xl font-extrabold tracking-[-.08em] text-[#3f6886]">4,9</span><div className="pb-1"><div className="flex text-[#f59f0c]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div><p className="mt-1 text-xs font-medium text-[#3f6886]">Baseado em 36 avaliações</p></div></div></Panel><Panel className="p-6"><div className="grid grid-cols-5 gap-3">{[5,4,3,2,1].map((score, index) => <div key={score} className="text-center"><div className="flex h-20 items-end justify-center"><div className="w-full rounded-t-md bg-[#3f6886]" style={{ height: `${[92, 35, 9, 3, 2][index]}%` }} /></div><p className="mt-2 text-xs font-bold text-[#3f6886]">{score} <Star className="inline h-3 w-3 fill-[#f59f0c] text-[#f59f0c]" /></p></div>)}</div></Panel></section>
      <Panel className="p-5 sm:p-6"><div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Comentários dos pacientes</h3><p className="mt-1 text-xs text-[#3f6886]">As avaliações são permanentes e não podem ser apagadas.</p></div><OutlineButton className="h-10 px-3" onClick={() => toast("Filtro aberto", { description: "Todos os comentários estão sendo exibidos." })}><Search className="h-4 w-4" /> Filtrar</OutlineButton></div><div className="divide-y divide-[#e5e7eb]">{reviews.map((review) => <article key={review.name} className="py-5 first:pt-0 last:pb-0"><div className="flex gap-3"><div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-extrabold", review.color)}>{review.initials}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-extrabold text-[#3f6886]">{review.name}</p><p className="mt-0.5 text-[11px] font-medium text-[#3f6886]">{review.date}</p></div><div className="flex text-[#f59f0c]">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div></div><p className="mt-3 text-sm leading-6 text-[#3f6886]">“{review.text}”</p>{responses[review.name] ? <div className="mt-4 rounded-xl bg-[#d1f0e3] p-3 text-sm leading-6 text-[#3f6886]"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">Sua resposta</p>{responses[review.name]}</div> : <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={drafts[review.name] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [review.name]: event.target.value }))} placeholder="Escreva uma resposta pública…" className="h-10 flex-1 rounded-xl border border-[#e5e7eb] bg-[#ffffff] px-3 text-sm outline-none focus:border-[#e5e7eb] focus:ring-4 focus:ring-[#d6e8f6]/15" /><button onClick={() => { const text = drafts[review.name]?.trim(); if (!text) return toast.error("Escreva uma resposta antes de enviar."); setResponses((current) => ({ ...current, [review.name]: text })); toast.success("Resposta publicada"); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#d1f0e3] px-3 text-xs font-extrabold text-[#3f6886] transition hover:bg-[#d1f0e3]"><Send className="h-3.5 w-3.5" /> Responder</button></div>}</div></div></article>)}</div></Panel>
    </>
  );
}

function CompanyDashboard({ go }: { go: (path: string) => void }) {
  return <><PageHeading screen="company" /><section className="relative overflow-hidden rounded-[22px] bg-[#3f6886] p-6 text-white shadow-[0_18px_40px_rgba(63,104,134,.2)] sm:p-7"><div className="absolute -right-8 -top-16 h-48 w-48 rounded-full border-[20px] border-[#d6e8f6]/15" /><div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-[#d6e8f6]"><Sparkles className="h-4 w-4" /><span className="text-[10px] font-extrabold tracking-[.12em]">BENEFÍCIO EM AÇÃO</span></div><h2 className="font-display text-2xl font-extrabold tracking-[-.05em]">Cuidar do time também é estratégia.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#e5e7eb]">137 colaboradores já podem aproveitar a rede SAFEpass. Sua adesão está acima da média do setor.</p></div><div className="flex gap-8 rounded-2xl border border-white/10 bg-[#3f6886]/75 px-5 py-4"><div><p className="font-display text-2xl font-extrabold text-[#d6e8f6]">82%</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.07em] text-[#e5e7eb]">Adesão ativa</p></div><div className="h-10 w-px bg-white/15" /><div><p className="font-display text-2xl font-extrabold">+24</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.07em] text-[#e5e7eb]">No último mês</p></div></div></div></section><section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric icon={UsersRound} label="Colaboradores" value="137" foot="12 aguardando convite" color="green" /><Metric icon={HeartPulse} label="Utilização" value="64%" foot="+9% neste trimestre" color="lime" /><Metric icon={CalendarDays} label="Atendimentos" value="226" foot="Neste mês" color="blue" /><Metric icon={FileText} label="Atestados" value="4" foot="Para revisar" color="amber" /></section><section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Panel className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Saúde do benefício</h3><p className="mt-1 text-xs text-[#3f6886]">Engajamento dos últimos seis meses.</p></div><span className="rounded-full bg-[#d1f0e3] px-2.5 py-1 text-[10px] font-extrabold text-[#3f6886]">EM CRESCIMENTO</span></div><div className="mt-8 flex h-40 items-end gap-3 px-2">{[42, 55, 49, 67, 72, 88].map((value, index) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={index}><div className="w-full max-w-10 rounded-t-lg bg-[#3f6886] transition hover:opacity-80" style={{ height: value }} /><span className="text-[10px] font-bold text-[#3f6886]">{["Abr", "Mai", "Jun", "Jul", "Ago", "Set"][index]}</span></div>)}</div></Panel><Panel className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Ações rápidas</h3><ArrowUpRight className="h-4 w-4 text-[#3f6886]" /></div><div className="space-y-2">{[["Adicionar colaborador", UserPlus, "/colaboradores"], ["Ver benefícios ativos", HeartPulse, "/beneficios"], ["Organizar atestados", FileText, "/atestados"]].map(([label, Icon, href]) => <button key={label as string} onClick={() => go(href as string)} className="flex w-full items-center gap-3 rounded-xl border border-[#e5e7eb] p-3 text-left transition hover:border-[#e5e7eb] hover:bg-[#ffffff]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d1f0e3] text-[#3f6886]"><Icon className="h-4 w-4" /></span><span className="flex-1 text-sm font-bold text-[#3f6886]">{label as string}</span><ArrowUpRight className="h-4 w-4 text-[#3f6886]" /></button>)}</div></Panel></section></>;
}

function EmployeesView() {
  const [employees, setEmployees] = useState([{ name: "André Martins", area: "Operações", email: "andre.martins@veredas.com", status: "Ativo", initials: "AM" }, { name: "Bianca Rocha", area: "Pessoas & Cultura", email: "bianca.rocha@veredas.com", status: "Ativo", initials: "BR" }, { name: "Caio Nunes", area: "Tecnologia", email: "caio.nunes@veredas.com", status: "Convite enviado", initials: "CN" }, { name: "Fernanda Lima", area: "Financeiro", email: "fernanda.lima@veredas.com", status: "Ativo", initials: "FL" }]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  return <><PageHeading screen="employees" action={<PrimaryButton onClick={() => setShowForm((value) => !value)}><UserPlus className="h-4 w-4" /> Adicionar colaborador</PrimaryButton>} />{showForm && <Panel className="mb-5 p-5"><form onSubmit={(event) => { event.preventDefault(); if (!newName.trim()) return toast.error("Informe o nome do colaborador."); setEmployees((current) => [...current, { name: newName, area: "A definir", email: `${newName.toLowerCase().replaceAll(" ", ".")}@veredas.com`, status: "Convite enviado", initials: newName.split(" ").map((part) => part[0]).slice(0,2).join("") }]); setNewName(""); setShowForm(false); toast.success("Convite enviado ao novo colaborador."); }} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"><Field label="Nome completo" placeholder="Nome do colaborador" /><Field label="E-mail corporativo" placeholder="nome@empresa.com" /><Field label="Área" placeholder="Ex.: Operações" /><div className="self-end"><PrimaryButton className="h-11" type="submit"><Send className="h-4 w-4" /> Enviar convite</PrimaryButton></div></form><input value={newName} onChange={(event) => setNewName(event.target.value)} className="sr-only" aria-hidden="true" /></Panel>}<Panel className="overflow-hidden"><div className="flex flex-col gap-4 border-b border-[#e5e7eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Lista de colaboradores</h3><p className="mt-1 text-xs text-[#3f6886]">{employees.length} pessoas registradas no benefício.</p></div><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3f6886]" /><input placeholder="Buscar colaborador" className="h-10 rounded-xl border border-[#e5e7eb] bg-[#ffffff] pl-9 pr-3 text-sm outline-none focus:border-[#e5e7eb] focus:ring-4 focus:ring-[#d6e8f6]/15" /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[#e5e7eb] bg-[#ffffff] text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]"><th className="px-6 py-3.5">Colaborador</th><th className="px-3 py-3.5">Área</th><th className="px-3 py-3.5">E-mail</th><th className="px-3 py-3.5">Status</th><th className="px-6 py-3.5" /></tr></thead><tbody>{employees.map((employee) => <tr key={employee.email} className="border-b border-[#e5e7eb] last:border-none transition hover:bg-[#ffffff]"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#d1f0e3] text-[11px] font-extrabold text-[#3f6886]">{employee.initials}</div><p className="text-sm font-bold text-[#3f6886]">{employee.name}</p></div></td><td className="px-3 py-4 text-sm font-medium text-[#3f6886]">{employee.area}</td><td className="px-3 py-4 text-sm font-medium text-[#3f6886]">{employee.email}</td><td className="px-3 py-4"><span className={cx("rounded-full px-2.5 py-1 text-[10px] font-extrabold", employee.status === "Ativo" ? "bg-[#d1f0e3] text-[#2f9e5c]" : "bg-[#fff5b2] text-[#f59f0c]")}>{employee.status}</span></td><td className="px-6 py-4 text-right"><button onClick={() => { setEmployees((current) => current.filter((item) => item.email !== employee.email)); toast.success("Acesso do colaborador removido."); }} className="rounded-lg p-2 text-[#3f6886] hover:bg-[#eb9180] hover:text-[#e92423]" aria-label={`Remover ${employee.name}`}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></Panel><p className="mt-3 text-xs text-[#3f6886]"><CircleAlert className="mr-1 inline h-3.5 w-3.5 text-[#3f6886]" /> Ao remover uma pessoa, o acesso aos benefícios SAFEpass é desativado imediatamente.</p></>;
}

function BenefitsView() {
  return <><PageHeading screen="benefits" action={<OutlineButton onClick={() => toast("Relatório preparado", { description: "O demonstrativo de benefícios será baixado em breve." })}><Download className="h-4 w-4" /> Exportar relatório</OutlineButton>} /><section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><Panel className="overflow-hidden"><div className="bg-[#3f6886] p-6 text-white"><div className="flex items-start justify-between"><div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold tracking-[.08em] text-[#d6e8f6]">PLANO EMPRESARIAL</span><h2 className="mt-5 font-display text-2xl font-extrabold tracking-[-.05em]">SAFEpass Essencial</h2><p className="mt-2 text-sm text-[#e5e7eb]">Saúde acessível e rede qualificada para todo o time.</p></div><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d6e8f6] text-[#3f6886]"><HeartPulse className="h-6 w-6" /></div></div></div><div className="grid divide-y divide-[#e5e7eb] p-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="py-3 sm:px-3 sm:py-0"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">Colaboradores</p><p className="mt-1 font-display text-2xl font-extrabold text-[#3f6886]">137</p><p className="mt-1 text-xs font-semibold text-[#3f6886]">do total de 150</p></div><div className="py-3 sm:px-5 sm:py-0"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">Rede disponível</p><p className="mt-1 font-display text-2xl font-extrabold text-[#3f6886]">+2.400</p><p className="mt-1 text-xs font-semibold text-[#3f6886]">prestadores parceiros</p></div><div className="py-3 sm:px-5 sm:py-0"><p className="text-[10px] font-extrabold uppercase tracking-[.08em] text-[#3f6886]">Renovação</p><p className="mt-1 font-display text-2xl font-extrabold text-[#3f6886]">Jan/27</p><p className="mt-1 text-xs font-semibold text-[#3f6886]">renovação automática</p></div></div></Panel><Panel className="p-6"><p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#3f6886]">Engajamento</p><div className="mt-4 flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "conic-gradient(#3f6886 0 64%, #e5e7eb 64% 100%)" }}><div className="grid h-12 w-12 place-items-center rounded-full bg-white font-display text-sm font-extrabold text-[#3f6886]">64%</div></div><div><p className="font-display text-xl font-extrabold tracking-[-.04em] text-[#3f6886]">Acima da média</p><p className="mt-1 text-xs leading-5 text-[#3f6886]">Uso consistente da rede e dos programas preventivos.</p></div></div></Panel></section><section className="mt-5 grid gap-5 md:grid-cols-3">{[["Rede de cuidado", "Consultas, exames e especialidades com condições exclusivas.", HeartPulse], ["Apoio emocional", "Acesso facilitado a psicologia e bem-estar mental.", UserCog], ["Gestão inteligente", "Indicadores para apoiar decisões de pessoas e cultura.", ClipboardCheck]].map(([title, description, Icon]) => <Panel className="p-5" key={title as string}><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d1f0e3] text-[#3f6886]"><Icon className="h-5 w-5" /></div><h3 className="mt-5 font-display font-extrabold tracking-[-.04em] text-[#3f6886]">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#3f6886]">{description as string}</p><button className="mt-4 text-xs font-extrabold text-[#3f6886]">Entender benefício <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></button></Panel>)}</section></>;
}

function CertificatesView() {
  const [files, setFiles] = useState(["Atestado_Joana_Silva.pdf", "Declaração_Ana_Paula.pdf"]);
  return <><PageHeading screen="certificates" action={<OutlineButton onClick={() => toast("Exportação agendada")}><Download className="h-4 w-4" /> Exportar planilha</OutlineButton>} /><section className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]"><div className="space-y-5"><Panel className="p-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d1f0e3] text-[#3f6886]"><FileUp className="h-5 w-5" /></div><h2 className="mt-5 font-display text-xl font-extrabold tracking-[-.05em] text-[#3f6886]">Enviar atestado</h2><p className="mt-2 text-sm leading-6 text-[#3f6886]">Anexe documentos médicos e mantenha tudo centralizado com privacidade.</p><label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e7eb] bg-[#d1f0e3] px-4 text-center transition hover:border-[#e5e7eb] hover:bg-[#ffffff]"><Upload className="h-5 w-5 text-[#3f6886]" /><span className="mt-2 text-sm font-bold text-[#3f6886]">Clique para enviar o arquivo</span><span className="mt-1 text-xs text-[#3f6886]">PDF, JPG ou PNG · até 10 MB</span><input type="file" className="sr-only" onChange={(event) => { const name = event.target.files?.[0]?.name; if (name) { setFiles((current) => [name, ...current]); toast.success("Arquivo enviado e aguardando organização."); } }} /></label></Panel><Panel className="p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.09em] text-[#3f6886]">Confidencialidade</p><p className="mt-2 text-sm leading-6 text-[#3f6886]">Apenas profissionais autorizados de RH visualizam estes documentos, seguindo práticas de segurança e privacidade.</p></Panel></div><Panel className="overflow-hidden"><div className="flex flex-col gap-4 border-b border-[#e5e7eb] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-[#3f6886]">Documentos recentes</h3><p className="mt-1 text-xs text-[#3f6886]">Acompanhe o status da organização.</p></div><button className="inline-flex items-center gap-2 self-start rounded-xl border border-[#e5e7eb] px-3 py-2 text-xs font-extrabold text-[#3f6886] hover:bg-[#ffffff]"><Search className="h-3.5 w-3.5" /> Buscar</button></div><div className="divide-y divide-[#e5e7eb]">{[...files.map((name, index) => ({ name, employee: index === 0 ? "Joana Silva" : "Ana Paula", area: index === 0 ? "Operações" : "Comercial", date: "22 set 2026", status: index === 0 ? "Em análise" : "Organizado" })), { name: "Atestado_Caio_Nunes.pdf", employee: "Caio Nunes", area: "Tecnologia", date: "20 set 2026", status: "Organizado" }, { name: "Declaração_Paulo_Amaral.pdf", employee: "Paulo Amaral", area: "Financeiro", date: "18 set 2026", status: "Organizado" }].map((doc) => <div className="flex items-center gap-3 p-4 sm:px-6" key={`${doc.name}-${doc.employee}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff5b2] text-[#f59f0c]"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#3f6886]">{doc.name}</p><p className="mt-1 text-xs text-[#3f6886]">{doc.employee} · {doc.area} · {doc.date}</p></div><span className={cx("hidden rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:block", doc.status === "Organizado" ? "bg-[#d1f0e3] text-[#2f9e5c]" : "bg-[#fff5b2] text-[#f59f0c]")}>{doc.status}</span><button className="rounded-lg p-2 text-[#3f6886] hover:bg-[#d1f0e3] hover:text-[#3f6886]"><ExternalLink className="h-4 w-4" /></button></div>)}</div></Panel></section></>;
}

function Sidebar({ mode, current, mobileOpen, onClose, onNavigate }: { mode: Mode; current: Screen; mobileOpen: boolean; onClose: () => void; onNavigate: (item: NavItem) => void }) {
  const nav = mode === "provider" ? providerNavigation : companyNavigation;
  return (
    <aside className={cx("fixed bottom-0 left-0 top-[76px] z-40 flex w-[276px] flex-col border-r border-[#e7eef3] bg-white px-4 py-5 text-[#3f6886] shadow-[8px_0_24px_rgba(63,104,134,.04)] transition-transform duration-300 lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex justify-end px-2 lg:hidden">
        <button onClick={onClose} className="rounded-lg p-2 text-[#6e8798] hover:bg-[#f1f6fa]" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-7 px-2"><p className="text-[10px] font-extrabold tracking-[.13em] text-[#9aabb7]">{mode === "provider" ? "ÁREA DO PRESTADOR" : "ÁREA DA EMPRESA"}</p></div>
      <nav className="mt-3 space-y-1" aria-label={mode === "provider" ? "Navegação da área do prestador" : "Navegação da área da empresa"}>
        {nav.map((item) => {
          const Icon = item.icon;
          const selected = current === item.screen;
          return <button key={item.label} onClick={() => onNavigate(item)} className={cx("group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition", selected ? "bg-[#d6e8f6] text-[#3f6886] shadow-[0_6px_16px_rgba(63,104,134,.08)]" : "text-[#718493] hover:bg-[#f1f6fa] hover:text-[#3f6886]")}><Icon className={cx("h-[18px] w-[18px]", selected ? "text-[#3f6886]" : "text-[#8298a7] group-hover:text-[#3f6886]")} /><span className="flex-1">{item.label}</span>{item.badge && <span className={cx("grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold", selected ? "bg-white text-[#3f6886]" : "bg-[#eef4f8] text-[#6e8798]")}>{item.badge}</span>}</button>;
        })}
      </nav>
      <div className="mt-auto pt-6">
        <button onClick={() => toast("A Central de ajuda está disponível para orientar você.")} className="flex w-full items-center gap-3 rounded-2xl border border-[#e5edf2] bg-[#f8fbfd] px-3 py-3 text-left text-sm font-bold text-[#668092] transition hover:border-[#c8ddeb] hover:bg-[#f1f6fa] hover:text-[#3f6886]"><HelpCircle className="h-[18px] w-[18px] text-[#3f6886]" />Central de ajuda</button>
      </div>
    </aside>
  );
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const paths: Record<string, Screen> = { "/": "dashboard", "/perfil": "profile", "/servicos": "services", "/equipe": "team", "/cupons": "coupons", "/validar-cupom": "validate", "/avaliacoes": "reviews", "/empresa": "company", "/colaboradores": "employees", "/beneficios": "benefits", "/atestados": "certificates" };
  const initialMode: Mode = ["company", "employees", "benefits", "certificates"].includes(paths[location] ?? "dashboard") ? "company" : "provider";
  const [mode, setMode] = useState<Mode>(initialMode);
  const current = paths[location] ?? (mode === "company" ? "company" : "dashboard");
  const go = (path: string) => { setLocation(path); setMobileOpen(false); setAccountOpen(false); };
  const changeMode = (next: Mode) => { setMode(next); go(next === "provider" ? "/" : "/empresa"); };
  const renderScreen = () => { switch (current) { case "dashboard": return <ProviderDashboard go={go} />; case "profile": return <ProfileView />; case "services": return <ServicesView />; case "team": return <TeamView />; case "coupons": return <CouponsView />; case "validate": return <ValidationView />; case "reviews": return <ReviewsView />; case "company": return <CompanyDashboard go={go} />; case "employees": return <EmployeesView />; case "benefits": return <BenefitsView />; case "certificates": return <CertificatesView />; default: return <ProviderDashboard go={go} />; } };
  return (
    <div className="min-h-screen bg-[#f4f7f5] text-[#1e4a43]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-[76px] items-center justify-between border-b border-[#e5edf2] bg-white px-4 shadow-[0_4px_18px_rgba(63,104,134,.05)] sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl text-[#3f6886] hover:bg-[#f1f6fa] lg:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <Logo />
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={() => toast("Conheça os planos SAFEpass", { description: "A apresentação de planos estará disponível aqui." })} className="text-xs font-extrabold text-[#3f6886] transition hover:text-[#2f526d] sm:text-sm">Conheça Nossos Planos</button>
          <div className="relative">
            <button onClick={() => setAccountOpen((open) => !open)} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-[#f1f6fa]" aria-haspopup="menu" aria-expanded={accountOpen} aria-label="Abrir menu da conta"><Avatar size="sm" /><ChevronDown className={cx("h-4 w-4 text-[#3f6886] transition-transform", accountOpen && "rotate-180")} /></button>
            {accountOpen && <div className="absolute right-0 top-[calc(100%+10px)] w-52 overflow-hidden rounded-2xl border border-[#dfeaf1] bg-white p-1.5 shadow-[0_16px_32px_rgba(63,104,134,.16)]" role="menu">
              {mode === "provider" && <button onClick={() => go("/perfil")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#4c687c] hover:bg-[#f1f6fa] hover:text-[#3f6886]" role="menuitem"><UserRound className="h-4 w-4 text-[#3f6886]" />Meu perfil</button>}
              <button onClick={() => changeMode(mode === "provider" ? "company" : "provider")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#4c687c] hover:bg-[#f1f6fa] hover:text-[#3f6886]" role="menuitem">{mode === "provider" ? <Building2 className="h-4 w-4 text-[#3f6886]" /> : <BriefcaseBusiness className="h-4 w-4 text-[#3f6886]" />}Ir para {mode === "provider" ? "Empresa" : "Prestador"}</button>
              <div className="my-1 border-t border-[#edf2f6]" />
              <button onClick={() => { setAccountOpen(false); toast("Sessão encerrada"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#6d7f8d] hover:bg-[#fff5f4] hover:text-[#e92423]" role="menuitem"><LogOut className="h-4 w-4" />Log out</button>
            </div>}
          </div>
        </div>
      </header>
      <Sidebar mode={mode} current={current} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={(item) => go(item.href)} />
      {mobileOpen && <button onClick={() => setMobileOpen(false)} className="fixed inset-x-0 bottom-0 top-[76px] z-30 bg-[#203c50]/25 backdrop-blur-[1px] lg:hidden" aria-label="Fechar menu" />}
      <div className="min-h-screen pt-[76px] lg:pl-[276px]"><main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8">{renderScreen()}</main></div>
    </div>
  );
}
