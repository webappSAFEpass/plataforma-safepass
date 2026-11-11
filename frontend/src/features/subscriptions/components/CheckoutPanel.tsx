"use client";

import { CheckCircle2, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { usePlans } from "@/features/plans/hooks";
import { useSubscribe } from "@/features/subscriptions/hooks";
import { cn, formatCents } from "@/lib/utils";

/** Página de contratação: detalhes do plano, aceite dos termos e (futuramente) dados de pagamento. */
export function CheckoutPanel({ planCode }: { planCode: string }) {
  const { data: plans, isPending } = usePlans();
  const { data: me, isPending: meLoading } = useMe();
  const { openDialog } = useDialogs();
  const subscribe = useSubscribe();
  const [accepted, setAccepted] = useState(false);

  if (isPending || meLoading) return <Skeleton className="h-96" />;

  const plan = plans?.find((p) => p.code === planCode);
  if (!plan) {
    return (
      <p role="alert" className="text-slate-600">
        Plano não encontrado.{" "}
        <Link href="/#planos" className="font-semibold text-brand-blue underline">
          Ver planos disponíveis
        </Link>
      </p>
    );
  }

  const done = subscribe.isSuccess;
  const alreadyOnPlan = me?.subscription?.plan.code === plan.code;

  return (
    <div className="grid gap-8 md:grid-cols-5">
      <section className="rounded-2xl border-2 border-brand-blue-soft bg-white p-6 md:col-span-3">
        <h2 className="font-display text-2xl font-bold text-brand-blue">{plan.name}</h2>
        <p className="mb-6 mt-1 text-3xl font-bold text-ink">
          {formatCents(plan.price_cents)}
          <span className="text-sm font-normal text-slate-400"> /mês</span>
        </p>
        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f.label} className={cn(!f.included && "text-slate-400 line-through")}>
              {f.included ? "✓" : "✗"} {f.label}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-slate-500">
          Pontuação x{plan.points_multiplier} em cada avaliação que você fizer.
        </p>
      </section>

      <section className="rounded-2xl border-2 border-brand-blue-soft bg-white p-6 md:col-span-2">
        {done ? (
          <div role="status" className="space-y-3">
            <p className="flex items-center gap-2 font-semibold text-brand-green">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> Plano {plan.name} ativado!
            </p>
            {subscribe.data.gateway_provider === "simulated" ? (
              <p className="text-xs text-slate-500">Pagamento simulado: nenhuma cobrança foi feita.</p>
            ) : null}
            <Link href="/painel" className={cn(buttonVariants({ size: "full" }))}>
              Ir para meu painel
            </Link>
          </div>
        ) : !me ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Entre ou crie uma conta para contratar este plano.</p>
            <Button size="full" onClick={() => openDialog("login")}>Fazer login</Button>
            <Button size="full" variant="outline" onClick={() => openDialog("register", { accountType: "user" })}>
              Criar conta grátis
            </Button>
          </div>
        ) : me.user.role !== "user" ? (
          <p className="text-sm text-slate-600">Os planos são destinados a contas de usuário.</p>
        ) : alreadyOnPlan ? (
          <p className="text-sm text-slate-600">Você já está neste plano.</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              subscribe.mutate({ plan_code: plan.code, accept_terms: accepted });
            }}
          >
            <p className="flex items-start gap-2 rounded-lg bg-brand-amber-soft p-3 text-xs text-ink">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" aria-hidden />
              Ambiente de demonstração: o pagamento é simulado e nenhum cartão é solicitado.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-blue"
              />
              <span>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brand-blue underline">Termos de Uso</Link> do SAFEpass.</span>
            </label>
            {subscribe.error ? (
              <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
                {subscribe.error.message}
              </p>
            ) : null}
            <Button type="submit" variant="red" size="full" disabled={!accepted || subscribe.isPending}>
              {subscribe.isPending ? "Processando..." : `Contratar ${plan.name}`}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
