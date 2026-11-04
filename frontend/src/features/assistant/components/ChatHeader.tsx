"use client";

import { ArrowLeftIcon, BotIcon, CloseIcon } from "./icons";
import { cx } from "../cx";

type ChatHeaderProps = {
  subtitle: string;
  showBack: boolean;
  onBack: () => void;
  onClose: () => void;
};

export default function ChatHeader({ subtitle, showBack, onBack, onClose }: ChatHeaderProps) {
  return (
    <header className={cx("chat-header")}>
      {showBack && (
        <button
          type="button"
          className={cx("icon-btn", "header-btn")}
          aria-label="Voltar à identificação"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </button>
      )}

      <div className={cx("header-avatar")}>
        <BotIcon className={cx("icon", "icon-lg")} />
      </div>

      <div className={cx("header-id")}>
        <div className={cx("header-title-row")}>
          <h1>Assistente SAFEpass</h1>
          <span className={cx("online-dot")} role="img" aria-label="Online" />
        </div>
        <p className={cx("header-subtitle")}>{subtitle}</p>
      </div>

      <button
        type="button"
        className={cx("icon-btn", "header-btn")}
        aria-label="Fechar conversa"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </header>
  );
}
