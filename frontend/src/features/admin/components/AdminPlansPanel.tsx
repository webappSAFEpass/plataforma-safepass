"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPlans, useUpdateAdminPlan } from "@/features/admin/hooks";
import type { AdminPlan } from "@/features/admin/types";
import { formatCents } from "@/lib/utils";

export function AdminPlansPanel() {
  const { data: plans, isPending, isError, refetch } = useAdminPlans();

  return (
    <section>
      <h1 className="font-display text-2xl font-bold text-brand-blue">Gerenciar planos</h1>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-slate-500">
        Os valores são armazenados no PostgreSQL e alimentam a landing page e a contratação. Alterações em limites afetam novas contratações; revise-as antes de salvar.
      </p>

      {isPending ? (
        <div className="space-y-4" aria-busy>{[0, 1, 2].map((index) => <Skeleton key={index} className="h-80" />)}</div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-5 text-sm text-slate-600">
          <p>Não foi possível carregar os planos.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 font-semibold text-brand-blue underline">Tentar novamente</button>
        </div>
      ) : (
        <div className="space-y-5">
          {plans.map((plan) => <AdminPlanEditor key={plan.id} plan={plan} />)}
        </div>
      )}
    </section>
  );
}

interface PlanDraft {
  name: string;
  price: string;
  maxDependents: string;
  monthlyReviewLimit: string;
  pointsMultiplier: string;
  highlighted: boolean;
  active: boolean;
  sortOrder: string;
  featuresText: string;
}

function toDraft(plan: AdminPlan): PlanDraft {
  return {
    name: plan.name,
    price: (plan.price_cents / 100).toFixed(2).replace(".", ","),
    maxDependents: plan.max_dependents === null ? "" : String(plan.max_dependents),
    monthlyReviewLimit: plan.monthly_review_limit === null ? "" : String(plan.monthly_review_limit),
    pointsMultiplier: String(plan.points_multiplier),
    highlighted: plan.highlighted,
    active: plan.is_active,
    sortOrder: String(plan.sort_order),
    featuresText: plan.features.map((feature) => `${feature.included ? "[x]" : "[ ]"} ${feature.label}`).join("\n"),
  };
}

function AdminPlanEditor({ plan }: { plan: AdminPlan }) {
  const mutation = useUpdateAdminPlan();
  const [draft, setDraft] = useState<PlanDraft>(() => toDraft(plan));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => setDraft(toDraft(plan)), [plan]);

  function set<K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const priceNumber = Number(draft.price.trim().replace(/\s/g, "").replace(",", "."));
    const pointsMultiplier = Number(draft.pointsMultiplier);
    if (!draft.name.trim() || draft.name.trim().length < 2) {
      setValidationError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (!draft.price.trim() || !Number.isFinite(priceNumber) || priceNumber < 0 || priceNumber > 1_000_000) {
      setValidationError("Informe um preço mensal válido.");
      return;
    }
    if (!Number.isInteger(pointsMultiplier) || pointsMultiplier < 1 || pointsMultiplier > 100) {
      setValidationError("O multiplicador de pontos precisa ser um inteiro entre 1 e 100.");
      return;
    }
    const sortOrder = Number(draft.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100) {
      setValidationError("A ordem de exibição deve ser um inteiro entre 0 e 100.");
      return;
    }

    const featureLines = draft.featuresText.split("\n").map((line) => line.trim()).filter(Boolean);
    const features: { label: string; included: boolean }[] = [];
    for (const line of featureLines) {
      const match = line.match(/^\[(x| )\]\s+(.+)$/i);
      if (!match) {
        setValidationError("Cada benefício deve começar com [x] ou [ ] e depois o nome do benefício.");
        return;
      }
      const label = (match[2] ?? "").trim();
      if (!label) {
        setValidationError("Nenhum benefício pode ficar sem nome.");
        return;
      }
      features.push({ label, included: (match[1] ?? "").toLowerCase() === "x" });
    }

    const maxDependents = draft.maxDependents.trim() === "" ? null : Number(draft.maxDependents);
    const monthlyReviewLimit = draft.monthlyReviewLimit.trim() === "" ? null : Number(draft.monthlyReviewLimit);
    if (maxDependents !== null && (!Number.isInteger(maxDependents) || maxDependents < 0)) {
      setValidationError("O limite de dependentes deve ser zero ou um inteiro positivo. Deixe vazio para ilimitado.");
      return;
    }
    if (monthlyReviewLimit !== null && (!Number.isInteger(monthlyReviewLimit) || monthlyReviewLimit < 0)) {
      setValidationError("O limite de avaliações deve ser zero ou um inteiro positivo. Deixe vazio para ilimitado.");
      return;
    }

    mutation.mutate({
      code: plan.code,
      changes: {
        name: draft.name.trim(),
        price_cents: Math.round(priceNumber * 100),
        max_dependents: maxDependents,
        monthly_review_limit: monthlyReviewLimit,
        points_multiplier: pointsMultiplier,
        highlighted: draft.highlighted,
        features,
        is_active: draft.active,
        sort_order: sortOrder,
      },
    });
  }

  return (
    <article className="rounded-2xl border border-brand-blue-soft bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-brand-blue">{plan.name}</h2>
            <span className="rounded-full bg-brand-blue-soft/70 px-2.5 py-1 text-xs font-semibold text-brand-blue">{plan.code}</span>
            {!plan.is_active ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Inativo</span> : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">Preço atual: {formatCents(plan.price_cents)} / mês · Multiplicador de pontos x{plan.points_multiplier}</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do plano">
            <input value={draft.name} onChange={(event) => set("name", event.target.value)} maxLength={60} required className="admin-input" />
          </Field>
          <Field label="Preço mensal (R$)">
            <input value={draft.price} onChange={(event) => set("price", event.target.value)} inputMode="decimal" required className="admin-input" aria-describedby={`price-help-${plan.code}`} />
            <span id={`price-help-${plan.code}`} className="text-xs text-slate-400">Use vírgula ou ponto para os centavos.</span>
          </Field>
          <Field label="Máximo de dependentes">
            <input value={draft.maxDependents} onChange={(event) => set("maxDependents", event.target.value)} type="number" min={0} max={10000} placeholder="Ilimitado" className="admin-input" />
          </Field>
          <Field label="Avaliações por mês">
            <input value={draft.monthlyReviewLimit} onChange={(event) => set("monthlyReviewLimit", event.target.value)} type="number" min={0} max={100000} placeholder="Ilimitado" className="admin-input" />
          </Field>
          <Field label="Multiplicador de pontos">
            <input value={draft.pointsMultiplier} onChange={(event) => set("pointsMultiplier", event.target.value)} type="number" min={1} max={100} required className="admin-input" />
          </Field>
          <Field label="Ordem de exibição">
            <input value={draft.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} type="number" min={0} max={100} required className="admin-input" />
            <span className="text-xs text-slate-400">Valores menores aparecem primeiro na página de planos.</span>
          </Field>
        </div>

        <Field label="Benefícios">
          <Textarea rows={5} value={draft.featuresText} onChange={(event) => set("featuresText", event.target.value)} aria-describedby={`features-help-${plan.code}`} />
          <span id={`features-help-${plan.code}`} className="text-xs text-slate-400">Uma linha por benefício: [x] incluído ou [ ] não incluído.</span>
        </Field>

        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.highlighted} onChange={(event) => set("highlighted", event.target.checked)} className="h-4 w-4 accent-brand-blue" />Destacar na página de planos</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} className="h-4 w-4 accent-brand-blue" />Plano ativo e disponível</label>
        </div>

        {validationError ? <p role="alert" className="text-sm text-brand-red">{validationError}</p> : null}
        {mutation.error ? <p role="alert" className="text-sm text-brand-red">{mutation.error.message}</p> : null}
        {mutation.isSuccess ? <p role="status" className="text-sm text-brand-green">Plano atualizado e publicado para novas consultas.</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar alterações"}</Button>
        </div>
      </form>
    </article>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">{label}{children}</label>;
}
