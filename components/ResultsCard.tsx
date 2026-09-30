"use client";

import { useState, type FormEvent } from "react";
import type { Card, DocumentItem, Provider } from "@/lib/contracts";
import { CheckCircleIcon, PinIcon, SearchIcon, ShieldCheckIcon } from "./icons";

export type CardActions = {
  /** Resolve false quando não deu para registrar a resposta (os botões voltam a funcionar). */
  onConsent: (granted: boolean) => Promise<boolean>;
  onRecado: (mensagem: string) => Promise<void>;
};

type ResultsCardProps = CardActions & { card: Card };

export default function ResultsCard({ card, onConsent, onRecado }: ResultsCardProps) {
  switch (card.type) {
    case "providers":
      return <ProvidersList providers={card.data} total={card.total} />;
    case "documents":
      return <DocumentsList documents={card.data} />;
    case "whatsapp":
      return card.data.withinHours && card.data.link ? (
        <div className="results">
          <article className="result-card">
            <div className="result-info">
              <h3>Atendimento humano</h3>
              <p>Um atendente continua a conversa pelo WhatsApp.</p>
            </div>
            <a className="btn-outline" href={card.data.link} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </a>
          </article>
        </div>
      ) : (
        <RecadoForm message={card.data.message} onRecado={onRecado} />
      );
    case "consent":
      return <ConsentPrompt message={card.data.message} onConsent={onConsent} />;
    default: {
      const unknown: never = card; // novo tipo de card no backend sem renderização aqui
      void unknown;
      return null;
    }
  }
}

function ProvidersList({ providers, total }: { providers: Provider[]; total: number }) {
  if (providers.length === 0) {
    return (
      <div className="results">
        <article className="result-card">
          <p className="result-location">Nenhum prestador encontrado com esses filtros.</p>
        </article>
      </div>
    );
  }
  const first = providers[0];
  return (
    <div className="results">
      <div className="filter-chips">
        <span className="filter-chip">
          <SearchIcon className="icon icon-xs" />
          {first.categoria}
        </span>
        {first.localizacao && (
          <span className="filter-chip">
            <PinIcon className="icon icon-xs" />
            {first.localizacao}
          </span>
        )}
        <span className="filter-chip">
          <CheckCircleIcon className="icon icon-xs" />
          {total > providers.length ? `${providers.length} de ${total}` : total}{" "}
          {total === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      <div className="result-list">
        {providers.map((p) => (
          <article className="result-card" key={p.id}>
            <div className="result-top">
              <div className="result-info">
                <h3>{p.nome}</h3>
                <p>
                  {[p.categoria, p.modalidade].filter(Boolean).join(" · ")}
                  {p.tags.length > 0 && ` · ${p.tags.slice(0, 3).join(", ")}`}
                </p>
              </div>
              {p.avaliacao !== null && (
                <span className="availability availability-success">
                  ★ {p.avaliacao.toFixed(1)}
                  {p.qtdAvaliacoes ? ` (${p.qtdAvaliacoes})` : ""}
                </span>
              )}
            </div>
            <p className="result-location">
              <PinIcon className="icon icon-xs" />
              {p.localizacao ?? "Local não informado"}
              {p.faixaPreco && ` · ${p.faixaPreco}`}
            </p>
            {p.telefone && (
              <a className="btn-outline" href={`tel:${p.telefone.replace(/[^\d+]/g, "")}`}>
                Ligar {p.telefone}
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<DocumentItem["status"], string> = {
  valido: "Válido",
  vencendo: "Vencendo",
  vencido: "Vencido",
};
const STATUS_TONE: Record<DocumentItem["status"], string> = {
  valido: "success",
  vencendo: "warning",
  vencido: "danger",
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function DocumentsList({ documents }: { documents: DocumentItem[] }) {
  return (
    <div className="results">
      <div className="result-list">
        {documents.map((doc) => (
          <article className="result-card" key={doc.id}>
            <div className="result-top">
              <div className="result-info">
                <h3>{doc.tipo}</h3>
                <p>{doc.titularNome}</p>
              </div>
              <span className={`availability availability-${STATUS_TONE[doc.status]}`}>
                {STATUS_LABEL[doc.status]}
              </span>
            </div>
            <p className="result-location">
              {doc.validade ? `Validade: ${formatDate(doc.validade)}` : "Sem validade"}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ConsentPrompt({ message, onConsent }: { message: string; onConsent: CardActions["onConsent"] }) {
  const [answered, setAnswered] = useState(false);
  async function answer(granted: boolean) {
    setAnswered(true);
    if (!(await onConsent(granted))) setAnswered(false);
  }
  return (
    <div className="results">
      <article className="result-card">
        <p className="result-location">
          <ShieldCheckIcon className="icon icon-xs icon-online" />
          {message}
        </p>
        <div className="card-actions">
          <button type="button" className="btn-primary" disabled={answered} onClick={() => answer(true)}>
            Sim, autorizo
          </button>
          <button type="button" className="btn-outline" disabled={answered} onClick={() => answer(false)}>
            Não
          </button>
        </div>
      </article>
    </div>
  );
}

function RecadoForm({ message, onRecado }: { message: string; onRecado: CardActions["onRecado"] }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setState("sending");
    try {
      await onRecado(text.trim());
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="results">
      <article className="result-card">
        <div className="result-info">
          <h3>Atendimento fora do horário</h3>
          <p>{message}</p>
        </div>
        {state === "sent" ? (
          <p className="result-location">
            <CheckCircleIcon className="icon icon-xs icon-online" />
            Recado enviado. Retornaremos no próximo horário útil.
          </p>
        ) : (
          <form className="field recado-form" onSubmit={handleSubmit}>
            <textarea
              aria-label="Seu recado"
              placeholder="Escreva seu recado..."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            {state === "error" && <p className="field-error">Não foi possível enviar. Tente de novo.</p>}
            <button type="submit" className="btn-outline" disabled={state === "sending"}>
              {state === "sending" ? "Enviando…" : "Deixar recado"}
            </button>
          </form>
        )}
      </article>
    </div>
  );
}
