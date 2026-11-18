"use client";

import { Info, Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type CatalogKind = "coupons" | "campaigns" | "partnerships";

const STATUSES = ["Ativo", "Agendado", "Pausado"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_TONE = { Ativo: "success", Agendado: "warning", Pausado: "neutral" } as const;

interface CatalogItem {
  id: string;
  name: string;
  detail: string;
  status: Status;
  attachment?: string;
}

const CONFIG: Record<
  CatalogKind,
  {
    title: string;
    description: string;
    singular: string;
    nameLabel: string;
    detailLabel: string;
    detailPlaceholder: string;
    hasUpload: boolean;
  }
> = {
  coupons: {
    title: "Cupons",
    description: "Cadastre e organize os cupons que serão disponibilizados pela plataforma.",
    singular: "cupom",
    nameLabel: "Nome do cupom",
    detailLabel: "Código ou benefício",
    detailPlaceholder: "Ex.: BEMVINDO10 — 10% de desconto",
    hasUpload: true,
  },
  campaigns: {
    title: "Campanhas",
    description: "Organize ações de divulgação, período de execução e situação de cada campanha.",
    singular: "campanha",
    nameLabel: "Nome da campanha",
    detailLabel: "Período ou canal",
    detailPlaceholder: "Ex.: Novembro — redes sociais",
    hasUpload: false,
  },
  partnerships: {
    title: "Parcerias",
    description:
      "Registre organizações parceiras e os contatos para acompanhamento administrativo.",
    singular: "parceria",
    nameLabel: "Nome da parceria ou organização",
    detailLabel: "Contato ou observação",
    detailPlaceholder: "Ex.: contato@empresa.com",
    hasUpload: false,
  },
};

/**
 * Prévia de interface do Squad 23: os registros ficam só no estado da página (somem ao
 * recarregar). Cupons e campanhas são do Desafio 02; ligar à API dele quando existir.
 */
export function AdminCatalogPanel({ kind }: { kind: CatalogKind }) {
  const config = CONFIG[kind];
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = term
    ? items.filter((item) =>
        `${item.name} ${item.detail} ${item.status}`.toLocaleLowerCase("pt-BR").includes(term),
      )
    : items;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("attachment");
    setItems((current) => [
      {
        id: crypto.randomUUID(),
        name: String(data.get("name")).trim(),
        detail: String(data.get("detail")).trim(),
        status: data.get("status") as Status,
        attachment: file instanceof File && file.name ? file.name : undefined,
      },
      ...current,
    ]);
    setShowForm(false);
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold tracking-[0.18em] text-success uppercase">
            Administração
          </p>
          <h1 className="font-display text-3xl font-bold text-primary">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            {config.description}
          </p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          <Plus aria-hidden /> {showForm ? "Fechar formulário" : `Novo ${config.singular}`}
        </Button>
      </div>

      <div
        role="note"
        className="mb-5 flex items-start gap-3 rounded-xl border border-warning/35 bg-warning-soft/50 p-4 text-sm text-ink"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <p>
          <strong>Prévia sem API:</strong> nada aqui é salvo. Os registros ficam só nesta página e
          somem ao recarregar.
        </p>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-2xl border border-accent bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 font-display text-xl font-bold text-primary">
            Cadastrar {config.singular}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={config.nameLabel}>
              <Input name="name" required placeholder="Digite um nome" />
            </Field>
            <Field label={config.detailLabel}>
              <Input name="detail" required placeholder={config.detailPlaceholder} />
            </Field>
            <Field label="Situação">
              <Select name="status" defaultValue="Ativo">
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
            </Field>
            {config.hasUpload ? (
              <Field label="Imagem ou material do cupom (opcional)">
                <Input name="attachment" type="file" accept="image/*,.pdf" className="py-2" />
              </Field>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="cta">
              Adicionar à prévia
            </Button>
          </div>
        </form>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-primary">Registros</h2>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar {config.title.toLocaleLowerCase("pt-BR")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Buscar ${config.title.toLocaleLowerCase("pt-BR")}`}
            className="pl-9"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-accent bg-white px-5 py-12 text-center">
          <p className="font-semibold text-primary">
            {search ? "Nenhum resultado encontrado." : `Nenhum ${config.singular} nesta prévia.`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Use “Novo {config.singular}” para testar o formulário.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-accent bg-white shadow-sm">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="bg-accent/35 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Detalhes</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent/70">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.detail}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                  </td>
                  <td className="max-w-40 truncate px-4 py-3 text-xs text-slate-500">
                    {item.attachment ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${item.name}`}
                      onClick={() =>
                        setItems((current) => current.filter((entry) => entry.id !== item.id))
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
