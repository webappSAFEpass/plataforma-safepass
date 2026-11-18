"use client";

import { Camera, FileText, FolderUp, PenLine, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Skeleton } from "@/components/ui/skeleton";

import { useExtractPrescription } from "../hooks/usePrescription";
import type { Extraction } from "../types";
import { MAX_FILE_BYTES, PHOTO_TYPES } from "../utils";

import { OtherDocumentForm } from "./OtherDocumentForm";
import { PrescriptionReview } from "./PrescriptionReview";

type Step = "choose" | "analyzing" | "error" | "review" | "manual" | "other";

const NOT_READ =
  "A foto não ficou legível ou não parece uma receita médica. Tente outra foto, mais nítida e bem iluminada.";

/** Adicionar documento: foto da receita (lida por IA), receita digitada ou outro documento. */
export function AddDocument() {
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");
  const [extraction, setExtraction] = useState<Extraction>();
  const [preview, setPreview] = useState<string | null>(null);
  const extract = useExtractPrescription();
  const cameraId = useId();
  const fileId = useId();
  const pickFile = (id: string) => document.getElementById(id)?.click();

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const fail = (message: string) => {
    setError(message);
    setStep("error");
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo depois de "Tentar novamente"
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return fail("Envie uma foto JPG ou PNG.");
    if (file.size > MAX_FILE_BYTES) return fail("A foto passa de 10 MB.");
    setPreview(URL.createObjectURL(file));
    setStep("analyzing");
    try {
      const result = await extract.mutateAsync(file);
      if (result.source === "gemini" && result.medications.length === 0) return fail(NOT_READ);
      setExtraction(result);
      setStep("review");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Não foi possível analisar o documento.");
    }
  };

  const restart = () => {
    setPreview(null);
    setExtraction(undefined);
    setStep("choose");
  };

  if (step === "other") return <OtherDocumentForm onBack={restart} />;

  if (step === "review" || step === "manual") {
    const fallback = extraction?.source === "tesseract";
    return (
      <div className={preview ? "grid items-start gap-5 lg:grid-cols-2" : "mx-auto max-w-2xl"}>
        {preview && (
          <Card className="space-y-3 p-3 lg:sticky lg:top-24">
            <Image
              src={preview}
              alt="Foto da receita enviada"
              width={800}
              height={1000}
              unoptimized
              className="max-h-[32rem] w-full rounded-xl bg-muted object-contain"
            />
            {fallback && extraction?.notes && (
              <pre className="rounded-xl bg-muted p-3 text-xs whitespace-pre-wrap text-ink">
                {extraction.notes}
              </pre>
            )}
          </Card>
        )}
        <div className="space-y-4">
          {step === "review" && (
            <Card className="border-warning bg-warning-soft/40 p-4 text-sm text-ink">
              {fallback
                ? "A leitura automática não ficou disponível agora. Preencha conferindo a foto e o texto capturado."
                : extraction?.needs_review
                  ? "Algumas informações precisam ser confirmadas. Confira os medicamentos destacados com a foto."
                  : "Receita lida. Confira os dados antes de salvar."}
            </Card>
          )}
          <PrescriptionReview extraction={extraction} onCancel={restart} />
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return (
      <Card className="mx-auto max-w-md space-y-4 p-10 text-center" aria-busy="true">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <h2 className="font-display text-2xl font-extrabold text-primary">
          Analisando seu documento...
        </h2>
        <p className="text-sm text-muted-foreground">
          Nossa IA está lendo a receita. Isso pode levar alguns segundos.
        </p>
      </Card>
    );
  }

  if (step === "error") {
    return (
      <Card className="mx-auto max-w-md space-y-5 p-8 text-center">
        <h2 className="font-display text-2xl font-extrabold text-primary">
          Não foi possível identificar as informações
        </h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="full" onClick={restart}>
          Tentar novamente
        </Button>
        <Button variant="outline" size="full" onClick={() => setStep("manual")}>
          Preencher manualmente
        </Button>
      </Card>
    );
  }

  const options: { icon: LucideIcon; title: string; hint: string; onClick: () => void }[] = [
    {
      icon: Camera,
      title: "Tirar foto da receita",
      hint: "A IA lê os medicamentos pela câmera",
      onClick: () => pickFile(cameraId),
    },
    {
      icon: FolderUp,
      title: "Enviar foto da receita",
      hint: "JPG ou PNG de até 10 MB, lida pela IA",
      onClick: () => pickFile(fileId),
    },
    {
      icon: PenLine,
      title: "Digitar receita",
      hint: "Preencha os medicamentos diretamente",
      onClick: () => setStep("manual"),
    },
    {
      icon: FileText,
      title: "Exame, consulta, vacina ou atestado",
      hint: "Guarde o arquivo (JPG, PNG ou PDF) e classifique",
      onClick: () => setStep("other"),
    },
  ];

  return (
    <Card className="mx-auto max-w-lg space-y-3 p-6">
      {/* Inputs nativos: no celular, `capture` abre a câmera direto */}
      <input
        id={cameraId}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        capture="environment"
        hidden
        aria-label="Foto pela câmera"
        onChange={onPick}
      />
      <input
        id={fileId}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        hidden
        aria-label="Foto da receita"
        onChange={onPick}
      />
      {options.map((o) => (
        <button
          key={o.title}
          type="button"
          onClick={o.onClick}
          className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:border-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <IconTile icon={o.icon} tone="brand" size="lg" />
          <span>
            <span className="block font-semibold text-ink">{o.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>
          </span>
        </button>
      ))}
    </Card>
  );
}
