"use client";

import { Fragment, useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat";
import ResultsCard, { type CardActions } from "./ResultsCard";

type ConversationProps = CardActions & {
  messages: ChatMessage[];
  /** Resposta em andamento: leitores de tela esperam o fim do streaming para anunciar. */
  busy: boolean;
};

export default function Conversation({ messages, busy, onConsent, onRecado }: ConversationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Rola para o fim sempre que a lista muda (equivale ao scrollToBottom do script original).
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      className="conversation"
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-busy={busy}
      aria-label="Conversa com o assistente"
    >
      <div className="started-pill">Atendimento iniciado agora</div>

      {messages.map((message) => (
        <Fragment key={message.id}>
          <div
            className={[
              "message",
              message.role === "user" ? "message-user" : "message-assistant",
              message.typing ? "message-typing" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="bubble">{message.text}</div>
          </div>

          {message.cards?.map((card, index) => (
            <ResultsCard
              key={`${message.id}-card-${index}`}
              card={card}
              onConsent={onConsent}
              onRecado={onRecado}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}
