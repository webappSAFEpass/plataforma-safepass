"use client";

import { FileUp, Upload } from "lucide-react";
import type { ChangeEvent } from "react";

import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";

import { ACCEPTED_CERTIFICATE_TYPES, MAX_CERTIFICATE_MB } from "../constants";

export function CertificateUpload({ onFile }: { onFile: (file: File) => void }) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  };

  return (
    <Card className="p-6">
      <IconTile icon={FileUp} size="lg" className="size-11" />
      <h2 className="mt-5 font-display text-xl font-extrabold tracking-[-.05em] text-primary">
        Enviar atestado
      </h2>
      <p className="mt-2 text-sm leading-6 text-primary">
        Anexe documentos médicos e mantenha tudo centralizado com privacidade.
      </p>
      <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-success-soft px-4 text-center transition focus-within:outline-2 focus-within:outline-ring hover:bg-card">
        <Upload className="size-5 text-primary" aria-hidden="true" />
        <span className="mt-2 text-sm font-bold text-primary">Clique para enviar o arquivo</span>
        <span className="mt-1 text-xs text-primary">
          PDF, JPG ou PNG · até {MAX_CERTIFICATE_MB} MB
        </span>
        <input
          type="file"
          accept={ACCEPTED_CERTIFICATE_TYPES}
          className="sr-only"
          onChange={handleChange}
        />
      </label>
    </Card>
  );
}
