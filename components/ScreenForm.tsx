"use client";

import { useState, type FormEvent } from "react";
import { SendIcon, ShieldCheckIcon, SparkleIcon } from "./icons";

export type ScreeningData = {
  name: string;
  phone: string;
  message: string;
};

type Errors = Partial<Record<keyof ScreeningData, string>>;

type ScreenFormProps = {
  /** Foca o campo de nome quando o painel abre. */
  autoFocus?: boolean;
  /** Valores para repreencher o formulário (ex.: após falha ao iniciar o atendimento). */
  initialValues?: ScreeningData;
  /** Erro vindo do servidor ao iniciar o atendimento. */
  error?: string | null;
  onSubmit: (data: ScreeningData) => void;
};

// Mesmos limites do backend (LeadRequest), para o erro aparecer no campo e não como 422.
const LIMITS = { name: 120, phone: 30, message: 4000 };

function validate({ name, phone, message }: ScreeningData): Errors {
  const errors: Errors = {};
  if (name.trim().length < 2) errors.name = "Informe seu nome.";
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 10 || digits > 13) errors.phone = "Informe um telefone válido.";
  if (!message.trim()) errors.message = "Conte como podemos ajudar.";
  return errors;
}

export default function ScreenForm({ autoFocus = false, initialValues, error, onSubmit }: ScreenFormProps) {
  const [values, setValues] = useState<ScreeningData>(initialValues ?? { name: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});

  function update(field: keyof ScreeningData, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: values.name.trim(),
      phone: values.phone,
      message: values.message.trim(),
    });
  }

  return (
    <form className="screen-form" onSubmit={handleSubmit} noValidate>
      <div className="form-intro">
        <div className="intro-icon">
          <SparkleIcon />
        </div>
        <h2>Antes de começar</h2>
        <p>Preencha seus dados para iniciarmos o atendimento.</p>
      </div>

      <div className={`field${errors.name ? " invalid" : ""}`}>
        <label htmlFor="chat-name">Nome</label>
        <input
          id="chat-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Como podemos chamar você?"
          value={values.name}
          maxLength={LIMITS.name}
          onChange={(event) => update("name", event.target.value)}
          autoFocus={autoFocus}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "err-name" : undefined}
        />
        {errors.name && (
          <p className="field-error" id="err-name">
            {errors.name}
          </p>
        )}
      </div>

      <div className={`field${errors.phone ? " invalid" : ""}`}>
        <label htmlFor="chat-phone">Telefone</label>
        <input
          id="chat-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          value={values.phone}
          maxLength={LIMITS.phone}
          onChange={(event) => update("phone", event.target.value)}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "err-phone" : undefined}
        />
        {errors.phone && (
          <p className="field-error" id="err-phone">
            {errors.phone}
          </p>
        )}
      </div>

      <div className={`field${errors.message ? " invalid" : ""}`}>
        <label htmlFor="chat-first-message">Como podemos ajudar?</label>
        <textarea
          id="chat-first-message"
          name="message"
          placeholder="Escreva sua primeira mensagem..."
          value={values.message}
          maxLength={LIMITS.message}
          onChange={(event) => update("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "err-message" : undefined}
        />
        {errors.message && (
          <p className="field-error" id="err-message">
            {errors.message}
          </p>
        )}
      </div>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-footer">
        <div className="privacy-note">
          <ShieldCheckIcon className="icon icon-sm icon-online" />
          Seus dados são usados apenas neste atendimento.
        </div>
        <button type="submit" className="btn-primary">
          Iniciar conversa
          <SendIcon className="icon icon-sm" />
        </button>
      </div>
    </form>
  );
}
