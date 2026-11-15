"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OwnerSelect } from "@/features/medications";

import { useUpdateDocument } from "../hooks/useDocuments";
import { documentEditSchema, type DocumentEditValues } from "../schemas";
import type { MedicalDocument } from "../types";
import { DOCUMENT_TYPES } from "../utils";

export function DocumentEditForm({
  document: doc,
  onDone,
}: {
  document: MedicalDocument;
  onDone: () => void;
}) {
  const update = useUpdateDocument();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentEditValues>({
    resolver: zodResolver(documentEditSchema),
    defaultValues: {
      type: doc.type,
      title: doc.title,
      document_date: doc.document_date ?? "",
      dependent_id: doc.dependent_id ?? "",
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        id: doc.id,
        patch: {
          type: v.type,
          title: v.title,
          document_date: v.document_date || null,
          dependent_id: v.dependent_id || null,
        },
      });
      toast.success("Documento atualizado");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    }
  });

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <Field label="Título" error={errors.title?.message}>
        <Input {...register("title")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Classificação">
          <Select {...register("type")}>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data">
          <Input type="date" {...register("document_date")} />
        </Field>
      </div>
      <Field label="De quem é">
        <OwnerSelect {...register("dependent_id")} />
      </Field>
      <Button type="submit" size="full" disabled={isSubmitting}>
        Salvar alterações
      </Button>
    </form>
  );
}
