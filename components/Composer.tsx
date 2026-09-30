"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon } from "./icons";

type ComposerProps = {
  disabled: boolean;
  onSend: (text: string) => void;
};

// Mesmo limite do backend (ChatMessage.content).
const MAX_LENGTH = 4000;

export default function Composer({ disabled, onSend }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Cresce até 112px, como o autoGrow do script original.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [text]);

  // Quando a resposta termina (ou o chat abre), o foco volta para o campo de mensagem.
  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // requestSubmit() (Enter) envia mesmo com o botão desabilitado: bloqueia aqui também.
    if (disabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <footer className="composer">
      <form className="composer-form" onSubmit={handleSubmit} ref={formRef}>
        <textarea
          className="composer-textarea"
          aria-label="Mensagem"
          placeholder="Digite sua mensagem..."
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          ref={textareaRef}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="composer-footer">
          <button type="submit" className="icon-btn send-btn" aria-label="Enviar mensagem" disabled={disabled}>
            <SendIcon className="icon icon-sm" />
          </button>
        </div>
      </form>
      <p className="composer-disclaimer">Respostas automáticas podem conter imprecisões.</p>
    </footer>
  );
}
