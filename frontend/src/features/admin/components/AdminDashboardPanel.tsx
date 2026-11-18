"use client";

import {
  Building2,
  ClipboardCheck,
  CreditCard,
  Handshake,
  MessageSquareText,
  Megaphone,
  Ticket,
  UserRound,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminDashboard } from "@/features/admin/hooks";

export function AdminDashboardPanel() {
  const { data, isPending, isError, refetch } = useAdminDashboard();

  return (
    <section>
      <div className="mb-7">
        <p className="mb-1 text-xs font-bold tracking-[0.18em] text-success uppercase">
          Área administrativa
        </p>
        <h1 className="font-display text-3xl font-bold text-primary">Visão geral</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Acompanhe os principais números e acesse as rotinas administrativas do SAFEpass.
        </p>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/5 p-5 text-sm text-slate-600"
        >
          <p>Não foi possível carregar os números administrativos.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 font-semibold text-primary underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UserRound} label="Usuários ativos" value={data.active_users} />
          <MetricCard icon={UserRoundPlus} label="Prestadores ativos" value={data.providers} />
          <MetricCard icon={Building2} label="Empresas ativas" value={data.companies} />
          <MetricCard
            icon={CreditCard}
            label="Assinaturas ativas"
            value={data.active_subscriptions}
          />
          <MetricCard
            icon={MessageSquareText}
            label="Avaliações recebidas"
            value={data.total_reviews}
          />
          <MetricCard
            icon={ClipboardCheck}
            label="Avaliações pendentes"
            value={data.pending_reviews}
          />
          <MetricCard
            icon={UserRoundPlus}
            label="Indicações recebidas"
            value={data.total_referrals}
          />
          <MetricCard icon={ClipboardCheck} label="Indicações novas" value={data.new_referrals} />
        </div>
      ) : null}

      <div className="mt-9">
        <h2 className="mb-4 font-display text-xl font-bold text-primary">Gerenciar plataforma</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            href="/admin/avaliacoes"
            icon={MessageSquareText}
            title="Moderar avaliações"
            description="Filtre por nota, responda e escolha os depoimentos exibidos na página inicial."
          />
          <ActionCard
            href="/admin/indicacoes"
            icon={UserRoundPlus}
            title="Acompanhar indicações"
            description="Consulte profissionais indicados e atualize o andamento de cada contato."
          />
          <ActionCard
            href="/admin/planos"
            icon={CreditCard}
            title="Gerenciar planos"
            description="Revise valores, limites, benefícios e destaque dos planos."
          />
          <ActionCard
            href="/admin/cupons"
            icon={Ticket}
            title="Gerenciar cupons"
            description="Cadastre ofertas, códigos, validade e materiais de divulgação."
          />
          <ActionCard
            href="/admin/campanhas"
            icon={Megaphone}
            title="Gerenciar campanhas"
            description="Organize campanhas, períodos de divulgação e situação de cada ação."
          />
          <ActionCard
            href="/admin/parcerias"
            icon={Handshake}
            title="Gerenciar parcerias"
            description="Mantenha os contatos e o acompanhamento das parcerias da plataforma."
          />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-accent bg-accent/25 p-5">
        <h2 className="font-display text-lg font-bold text-primary">Integração entre squads</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          O Meu Dashboard do usuário, pontos, benefícios e dependentes são responsabilidade do
          Desafio 02. Os perfis detalhados de prestadores e empresas pertencem ao Desafio 03. Este
          painel mantém as rotinas administrativas do Desafio 01, com integração de dados a ser
          conectada às APIs responsáveis.
        </p>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-accent bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="rounded-lg bg-accent/70 p-2 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-ink">
        {value.toLocaleString("pt-BR")}
      </p>
    </article>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-accent bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/65 text-primary transition group-hover:bg-primary group-hover:text-white">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="font-display text-lg font-bold text-primary group-hover:underline">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </Link>
  );
}
