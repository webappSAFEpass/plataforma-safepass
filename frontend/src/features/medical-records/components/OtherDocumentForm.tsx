"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OwnerSelect } from "@/features/medications";

import { useUploadDocument } from "../hooks/useDocuments";
import { documentUploadSchema, type DocumentUploadValues } from "../schemas";
import { DOCUMENT_FILE_TYPES, DOCUMENT_TYPES } from "../utils";

export const DOCUMENTS_HREF = "/historico-medico/documentos";

/** Exame, consulta, vacina ou atestado: guarda o arquivo com classificação, título, data e dono. */
export function OtherDocumentForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const upload = useUploadDocument();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentUploadValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: { type: "exam", title: "", document_date: "", dependent_id: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await upload.mutateAsync({
        file: v.file,
        type: v.type,
        title: v.title,
        document_date: v.document_date || null,
        dependent_id: v.dependent_id || null,
      });
      toast.success("Documento enviado");
      router.push(DOCUMENTS_HREF);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o documento.");
    }
  });

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <h2 className="font-display text-2xl font-extrabold text-primary">Enviar documento</h2>
        <Controller
          control={control}
          name="file"
          render={({ field }) => (
            <Field label="Arquivo (JPG, PNG ou PDF, até 10 MB)" error={errors.file?.message}>
              <Input
                type="file"
                accept={DOCUMENT_FILE_TYPES.join(",")}
                className="pt-2"
                onChange={(e) => field.onChange(e.target.files?.[0])}
              />
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Classificação">
            <Select {...register("type")}>
              {DOCUMENT_TYPES.filter((t) => t.value !== "prescription").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data do documento">
            <Input type="date" {...register("document_date")} />
          </Field>
        </div>
        <Field label="Título" error={errors.title?.message}>
          <Input placeholder="Ex.: Hemograma completo" {...register("title")} />
        </Field>
        <Field label="De quem é">
          <OwnerSelect selfLabel="Meu" {...register("dependent_id")} />
        </Field>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Salvar documento"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
