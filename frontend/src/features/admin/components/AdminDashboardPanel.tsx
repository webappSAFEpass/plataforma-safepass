"use client";

import {
  Building2,
  ClipboardCheck,
  CreditCard,
  MessageSquareText,
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
      <h1 className="font-display text-2xl font-bold text-brand-blue">Visão geral</h1>
      <p className="mb-7 mt-1 text-sm text-slate-500">
        Acompanhe os principais números e acesse as rotinas administrativas do SAFEpass.
      </p>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
          {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-5 text-sm text-slate-600">
          <p>Não foi possível carregar os números administrativos.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 font-semibold text-brand-blue underline">
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UserRound} label="Usuários ativos" value={data.active_users} />
          <MetricCard icon={UserRoundPlus} label="Prestadores ativos" value={data.providers} />
          <MetricCard icon={Building2} label="Empresas ativas" value={data.companies} />
          <MetricCard icon={CreditCard} label="Assinaturas ativas" value={data.active_subscriptions} />
          <MetricCard icon={MessageSquareText} label="Avaliações recebidas" value={data.total_reviews} />
          <MetricCard icon={ClipboardCheck} label="Avaliações não publicadas" value={data.pending_reviews} />
          <MetricCard icon={UserRoundPlus} label="Indicações recebidas" value={data.total_referrals} />
          <MetricCard icon={ClipboardCheck} label="Indicações novas" value={data.new_referrals} />
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ActionCard href="/admin/avaliacoes" title="Moderar avaliações" description="Filtre por nota, responda e escolha os depoimentos exibidos na página inicial." />
        <ActionCard href="/admin/indicacoes" title="Acompanhar indicações" description="Veja os profissionais indicados e atualize o andamento de cada contato." />
        <ActionCard href="/admin/planos" title="Gerenciar planos" description="Atualize valores, limites, benefícios e destaque dos planos." />
      </div>

      <div className="mt-8 rounded-2xl border border-brand-blue-soft bg-brand-blue-soft/25 p-5">
        <h2 className="font-display text-base font-bold text-brand-blue">Integração entre squads</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Pontos, cupons e campanhas devem usar os serviços do Desafio 02; os perfis detalhados de prestadores e empresas pertencem ao Desafio 03. Esta base mantém autenticação, identidade e banco compartilhados, sem duplicar essas tabelas.
        </p>
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-brand-blue-soft bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className="rounded-lg bg-brand-blue-soft/70 p-2 text-brand-blue"><Icon className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-ink">{value.toLocaleString("pt-BR")}</p>
    </article>
  );
}

function ActionCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-brand-blue-soft bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-md">
      <h2 className="font-display font-bold text-brand-blue group-hover:underline">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
    </Link>
  );
}
