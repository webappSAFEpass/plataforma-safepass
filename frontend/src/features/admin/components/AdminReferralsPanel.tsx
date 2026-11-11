"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReferrals, useUpdateAdminReferralStatus } from "@/features/admin/hooks";
import type { AdminReferral, ReferralStatus } from "@/features/admin/types";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;
const STATUSES: { value: ReferralStatus; label: string }[] = [
  { value: "new", label: "Nova" },
  { value: "contacted", label: "Contato realizado" },
  { value: "registered", label: "Cadastrado" },
  { value: "rejected", label: "Não prosseguir" },
];

export function AdminReferralsPanel() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isPlaceholderData, refetch } = useAdminReferrals(page, PAGE_SIZE);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  return (
    <section>
      <h1 className="font-display text-2xl font-bold text-brand-blue">Indicações de profissionais</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Acompanhe os contatos enviados pela comunidade e atualize o status de cada indicação.</p>

      {isPending ? (
        <div className="space-y-3" aria-busy>{[0, 1, 2].map((index) => <Skeleton key={index} className="h-28" />)}</div>
      ) : isError ? (
        <div role="alert" className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-5 text-sm text-slate-600">
          <p>Não foi possível carregar as indicações.</p>
          <button type="button" onClick={() => refetch()} className="mt-2 font-semibold text-brand-blue underline">Tentar novamente</button>
        </div>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl bg-brand-blue-soft/40 p-6 text-center text-sm text-slate-500">Ainda não recebemos indicações.</p>
      ) : (
        <>
          <ul className={`space-y-3 ${isPlaceholderData ? "opacity-60" : ""}`}>
            {data.items.map((referral) => <ReferralItem key={referral.id} referral={referral} />)}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>{data.total} {data.total === 1 ? "indicação" : "indicações"}</span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="pill" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
              <span>Página {page} de {totalPages}</span>
              <Button variant="outline" size="pill" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ReferralItem({ referral }: { referral: AdminReferral }) {
  const mutation = useUpdateAdminReferralStatus();
  const [status, setStatus] = useState<ReferralStatus>(referral.status);
  const unchanged = status === referral.status;

  return (
    <li className="rounded-2xl border border-brand-blue-soft bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-ink">{referral.professional_name}</h2>
          <p className="mt-1 text-sm text-slate-500">{referral.specialty || "Especialidade não informada"} · Recebida em {formatDate(referral.created_at)}</p>
          <p className="mt-2 break-words text-sm text-slate-600">
            {referral.contact ? `Contato: ${referral.contact}` : "Contato não informado"}
          </p>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ id: referral.id, status });
          }}
        >
          <label htmlFor={`status-${referral.id}`} className="sr-only">Status da indicação de {referral.professional_name}</label>
          <select id={`status-${referral.id}`} value={status} onChange={(event) => setStatus(event.target.value as ReferralStatus)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-ink">
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <Button type="submit" size="pill" disabled={mutation.isPending || unchanged}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
        </form>
      </div>
      {mutation.error ? <p role="alert" className="mt-3 text-xs text-brand-red">{mutation.error.message}</p> : null}
      {mutation.isSuccess ? <p role="status" className="mt-3 text-xs text-brand-green">Status atualizado.</p> : null}
    </li>
  );
}
