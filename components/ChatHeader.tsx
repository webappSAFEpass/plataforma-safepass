"use client";

import { ArrowLeftIcon, BotIcon, CloseIcon } from "./icons";

type ChatHeaderProps = {
  subtitle: string;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
};

export default function ChatHeader({ subtitle, showBack, onBack, onClose }: ChatHeaderProps) {
  return (
    <header className="chat-header">
      {showBack && (
        <button
          type="button"
          className="icon-btn header-btn"
          aria-label="Voltar à identificação"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </button>
      )}

      <div className="header-avatar">
        <BotIcon className="icon icon-lg" />
      </div>

      <div className="header-id">
        <div className="header-title-row">
          <h1>Assistente SAFEpass</h1>
          <span className="online-dot" role="img" aria-label="Online" />
        </div>
        <p className="header-subtitle">{subtitle}</p>
      </div>

      <button
        type="button"
        className="icon-btn header-btn"
        aria-label="Fechar conversa"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </header>
  );
}
