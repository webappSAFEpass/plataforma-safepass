"use client";

import { ArrowRight, CalendarClock, CircleHelp, CreditCard, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { formatCents, formatDate } from "@/lib/utils";

const ROLE_LABELS = {
  user: "Usuário",
  dependent: "Dependente",
  provider: "Prestador de serviço",
  company: "Empresa",
  admin: "Administrador",
} as const;

export function DashboardPlaceholder() {
  const { data: me, isPending, isError, refetch } = useMe();
  const { openDialog } = useDialogs();

  if (isPending) return <div className="mx-auto max-w-5xl px-6 py-16"><Skeleton className="h-48" /></div>;

  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-brand-blue">Não foi possível carregar seu painel</h1>
        <button type="button" onClick={() => refetch()} className="mt-4 font-semibold text-brand-blue underline">Tentar novamente</button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-brand-blue">Entre para acessar seu painel</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">Sua sessão expirou ou você não está conectado. Entre novamente para ver as informações da conta.</p>
        <Button className="mt-5" onClick={() => openDialog("login")}>Fazer login</Button>
      </div>
    );
  }

  const plan = me.subscription?.plan;
  const subscriptionEnd = me.subscription?.current_period_end;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Área da conta</p>
          <h1 className="font-display text-3xl font-bold text-brand-blue">Olá, {me.user.full_name}!</h1>
          <p className="mt-2 text-sm text-slate-500">Confira seu perfil e as informações principais da sua assinatura.</p>
        </div>
        <Link href="/#planos" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline">Conhecer planos <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-brand-blue-soft bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-xl bg-brand-blue-soft p-3 text-brand-blue"><UserRound className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 className="font-display text-lg font-bold text-brand-blue">Seus dados</h2>
              <p className="text-sm text-slate-500">Identificação da conta</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-slate-400">Nome</dt><dd className="font-medium text-ink">{me.user.full_name}</dd></div>
            <div><dt className="text-slate-400">E-mail</dt><dd className="break-all font-medium text-ink">{me.user.email}</dd></div>
            <div><dt className="text-slate-400">Perfil</dt><dd className="font-medium text-ink">{ROLE_LABELS[me.user.role]}</dd></div>
          </dl>
        </section>

        <section className="rounded-2xl border border-brand-blue-soft bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-xl bg-brand-green-soft p-3 text-brand-green"><CreditCard className="h-5 w-5" aria-hidden /></span>
            <div>
              <h2 className="font-display text-lg font-bold text-brand-blue">Seu plano</h2>
              <p className="text-sm text-slate-500">Plano atual associado à sua conta</p>
            </div>
          </div>
          {plan ? (
            <>
              <p className="font-display text-2xl font-bold text-ink">{plan.name}</p>
              <p className="mt-1 text-sm text-slate-500">{plan.price_cents === 0 ? "Gratuito" : `${formatCents(plan.price_cents)} por mês`}</p>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-blue-soft/30 p-3 text-sm text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" aria-hidden />
                <span>Multiplicador de pontos: x{plan.points_multiplier}</span>
              </div>
              {subscriptionEnd ? <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarClock className="h-4 w-4" aria-hidden /> Período atual até {formatDate(subscriptionEnd)}</p> : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">Não há assinatura associada à conta.</p>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-brand-blue-soft bg-brand-blue-soft/20 p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-white p-3 text-brand-blue"><Sparkles className="h-5 w-5" aria-hidden /></span>
          <div>
            <h2 className="font-display text-lg font-bold text-brand-blue">Benefícios e serviços</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              A consulta de prestadores, pontos, cupons e dependentes é fornecida pelos módulos específicos do SAFEpass. Esta área já utiliza a identidade e o plano compartilhados e será conectada aos recursos correspondentes durante a integração dos squads.
            </p>
            <Link href="/faq" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"><CircleHelp className="h-4 w-4" aria-hidden /> Consultar dúvidas frequentes</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
