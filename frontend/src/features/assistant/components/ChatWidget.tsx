"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  createId,
  errorText,
  getJson,
  postJson,
  streamChat,
  type ChatMessage,
} from "../lib/chat";
import type { AtendimentoInfo } from "../lib/contracts";
import ChatHeader from "./ChatHeader";
import Composer from "./Composer";
import Conversation from "./Conversation";
import ScreenForm, { type ScreeningData } from "./ScreenForm";
import { ChatIcon, CloseIcon } from "./icons";
import { cx } from "../cx";

// Sem o horário do backend (ex.: a chamada falhou), o aviso de recado fica sem citar o horário.
const RECADO_FALLBACK = "Deixe seu recado que retornamos no próximo horário útil.";

/** Bolha de erro; oferece recado quando o problema não se resolve esperando alguns segundos. */
function errorMessage(id: string, error: unknown, recadoHint: string): ChatMessage {
  const status = error instanceof ApiError ? error.status : 0;
  const offerRecado = status !== 429 && status !== 504;
  return {
    id,
    role: "assistant",
    text: errorText(error),
    cards: offerRecado
      ? [{ type: "whatsapp", data: { withinHours: false, link: null, message: recadoHint } }]
      : undefined,
  };
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScreeningData | undefined>(undefined);
  // Refs valem na hora (o estado só no próximo render): evitam capturas obsoletas nos handlers.
  const conversationRef = useRef<string | null>(null);
  const runRef = useRef(0); // muda ao voltar ao formulário: invalida respostas em andamento
  const replyingRef = useRef(false); // uma resposta por vez
  const abortRef = useRef<AbortController | null>(null);
  const lastQuestionRef = useRef("");
  // Horário do atendimento humano: vem das regras da PO no backend, não fica escrito aqui.
  const recadoHintRef = useRef(RECADO_FALLBACK);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  /** Envia a pergunta (o backend já tem o histórico) e preenche a bolha conforme o streaming chega. */
  async function ask(question: string, options: { retry?: boolean } = {}) {
    const conversation = conversationRef.current;
    if (!conversation || replyingRef.current) return;
    replyingRef.current = true;
    const run = runRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const botId = createId("bot");
    setMessages((current) => [
      ...current,
      { id: botId, role: "assistant", text: "Digitando…", typing: true },
    ]);
    setIsReplying(true);

    const update = (patch: (message: ChatMessage) => ChatMessage) => {
      if (run !== runRef.current) return;
      setMessages((current) => current.map((m) => (m.id === botId ? patch(m) : m)));
    };

    // Demonstração: ?foraDoHorario força o recado; ?dentroDoHorario força o link do WhatsApp.
    const params = new URLSearchParams(window.location.search);
    try {
      const result = await streamChat(
        {
          conversationId: conversation,
          messages: [{ role: "user", content: question }],
          retry: options.retry,
          simulateAfterHours: params.has("foraDoHorario"),
          simulateWithinHours: params.has("dentroDoHorario"),
        },
        {
          onToken: (text) =>
            update((m) => ({ ...m, typing: false, text: m.typing ? text : m.text + text })),
          onReset: () => update((m) => ({ ...m, typing: true, text: "Digitando…" })),
          onCard: (card) => update((m) => ({ ...m, cards: [...(m.cards ?? []), card] })),
        },
        controller.signal,
      );
      update((m) => ({ ...m, typing: false, text: result.reply, cards: result.cards }));
    } catch (error) {
      if (!isAbort(error)) update(() => errorMessage(botId, error, recadoHintRef.current));
    } finally {
      if (run === runRef.current) {
        replyingRef.current = false;
        abortRef.current = null;
        setIsReplying(false);
      }
    }
  }

  async function handleStart(data: ScreeningData) {
    const run = runRef.current;
    setDraft(data);
    setStartError(null);
    setFirstName(data.name.split(" ")[0]);
    setIsStarted(true);
    const first: ChatMessage = { id: createId("user"), role: "user", text: data.message };
    setMessages([first]);

    let conversation: string;
    try {
      ({ conversationId: conversation } = await postJson<{ conversationId: string }>("/api/lead", {
        nome: data.name,
        telefone: data.phone,
        mensagem: data.message,
      }));
    } catch (error) {
      if (run !== runRef.current) return;
      // Sem conversa não há chat: volta ao formulário, com os dados preenchidos, para tentar de novo.
      setIsStarted(false);
      setMessages([]);
      setStartError(`Não foi possível iniciar o atendimento. ${errorText(error)}`);
      return;
    }
    if (run !== runRef.current) return; // o usuário voltou enquanto o lead era criado
    conversationRef.current = conversation;
    getJson<AtendimentoInfo>("/api/atendimento")
      .then((info) => {
        recadoHintRef.current = info.mensagemForaDoHorario;
      })
      .catch(() => undefined); // sem o horário, o aviso usa o texto genérico
    setConversationId(conversation);
    lastQuestionRef.current = data.message;
    await ask(data.message);
  }

  function handleBack() {
    runRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    replyingRef.current = false;
    conversationRef.current = null;
    setConversationId(null);
    setIsStarted(false);
    setIsReplying(false);
    setFirstName("");
    setMessages([]);
    setDraft(undefined);
    setStartError(null);
  }

  function handleSend(question: string) {
    if (replyingRef.current || !conversationRef.current) return;
    lastQuestionRef.current = question;
    setMessages((current) => [...current, { id: createId("user"), role: "user", text: question }]);
    void ask(question);
  }

  /** Retorna false se não deu para registrar a resposta (o card libera os botões de novo). */
  async function handleConsent(granted: boolean): Promise<boolean> {
    if (replyingRef.current) return false;
    if (!granted) {
      setMessages((current) => [
        ...current,
        {
          id: createId("bot"),
          role: "assistant",
          text: "Tudo bem! Sem a sua autorização eu não consulto seus dados. Posso ajudar com planos, benefícios ou busca de prestadores.",
        },
      ]);
      return true;
    }
    try {
      await postJson("/api/consent", { action: "grant" });
    } catch (error) {
      setMessages((current) => [
        ...current,
        errorMessage(createId("bot"), error, recadoHintRef.current),
      ]);
      return false;
    }
    // Reprocessa a última pergunta já gravada, agora com permissão (retry: não grava de novo).
    await ask(lastQuestionRef.current, { retry: true });
    return true;
  }

  async function handleRecado(mensagem: string) {
    const conversation = conversationRef.current;
    if (!conversation) throw new Error("sem conversa");
    await postJson("/api/recado", { conversationId: conversation, mensagem });
  }

  return (
    <div className={cx("root")}>
      {isOpen && (
        <section
          className={cx("chat-panel")}
          role="dialog"
          aria-label="Assistente SAFEpass"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        >
          <ChatHeader
            subtitle={isStarted ? `Atendendo ${firstName}` : "Pronta para ajudar você"}
            showBack={isStarted}
            onBack={handleBack}
            onClose={() => setIsOpen(false)}
          />

          {isStarted ? (
            <div className={cx("screen-chat")}>
              <Conversation
                messages={messages}
                busy={isReplying}
                onConsent={handleConsent}
                onRecado={handleRecado}
              />
              <Composer disabled={isReplying || !conversationId} onSend={handleSend} />
            </div>
          ) : (
            <ScreenForm autoFocus initialValues={draft} error={startError} onSubmit={handleStart} />
          )}
        </section>
      )}

      <button
        type="button"
        className={cx("chat-fab")}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fechar assistente" : "Abrir assistente virtual"}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? (
          <CloseIcon className={cx("icon", "icon-lg")} />
        ) : (
          <ChatIcon className={cx("icon", "icon-lg")} />
        )}
      </button>
    </div>
  );
}
