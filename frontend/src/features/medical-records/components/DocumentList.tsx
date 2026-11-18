"use client";

import { Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OwnerSelect, ownerName, QueryState, useDependents } from "@/features/medications";

import {
  useDeleteDocument,
  useDocuments,
  useDownloadDocument,
  useUpdateDocument,
} from "../hooks/useDocuments";
import type { DocumentType, MedicalDocument } from "../types";
import { DOCUMENT_TYPES } from "../utils";

import { DocumentEditForm } from "./DocumentEditForm";
import { DocumentRow } from "./DocumentRow";

export const NEW_DOCUMENT_HREF = "/historico-medico/documentos/novo";

const fail = (error: Error) => toast.error(error.message);

/** Documentos com filtro por tipo, dono e título; baixar, editar, excluir e compartilhar. */
export function DocumentList() {
  const [type, setType] = useState<DocumentType | undefined>();
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const query = useDocuments({ type, q: q.trim() || undefined, dependent_id: owner || undefined });
  const { data: dependents = [] } = useDependents();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const download = useDownloadDocument();
  const [editing, setEditing] = useState<MedicalDocument | null>(null);
  const documents = query.data?.items ?? [];

  const onDelete = (doc: MedicalDocument) => {
    if (!window.confirm(`Excluir "${doc.title}"? O arquivo também será apagado.`)) return;
    remove.mutate(doc.id, { onSuccess: () => toast.success("Documento excluído"), onError: fail });
  };

  const chips = [
    { value: undefined, label: "Todos" },
    ...DOCUMENT_TYPES.map((t) => ({ value: t.value, label: t.plural })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Buscar pelo título"
            placeholder="Buscar pelo título..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <OwnerSelect
          aria-label="Filtrar por dono"
          selfLabel="Todos os donos"
          className="sm:w-56"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <Button asChild>
          <Link href={NEW_DOCUMENT_HREF}>
            <Plus aria-hidden="true" /> Adicionar documento
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        {chips.map((chip) => (
          <Button
            key={chip.label}
            size="pill"
            variant={type === chip.value ? "default" : "outline"}
            aria-pressed={type === chip.value}
            onClick={() => setType(chip.value)}
          >
            {chip.label}
          </Button>
        ))}
      </div>

      <Card className="flex items-start gap-3 bg-muted p-4 text-sm text-ink">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <p>
          <strong>Compartilhar com o assistente</strong> começa desligado em todo documento. O
          Assistente IA só lê os documentos que você ligar, e você pode desligar quando quiser.
        </p>
      </Card>

      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        isEmpty={documents.length === 0}
        onRetry={() => query.refetch()}
        empty="Nenhum documento encontrado. Tente outros filtros ou adicione um documento."
      >
        <Card>
          <p className="border-b px-4 py-3 text-sm text-muted-foreground">
            {query.data?.total} documento{query.data?.total === 1 ? "" : "s"}
          </p>
          <ul className="divide-y">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                owner={ownerName(doc.dependent_id, dependents)}
                onToggleShare={(shared) =>
                  update.mutate(
                    { id: doc.id, patch: { shared_with_assistant: shared } },
                    { onError: fail },
                  )
                }
                onDownload={() => download.mutate(doc, { onError: fail })}
                onEdit={() => setEditing(doc)}
                onDelete={() => onDelete(doc)}
              />
            ))}
          </ul>
        </Card>
      </QueryState>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Editar documento</DialogTitle>
          {editing && <DocumentEditForm document={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
