"use client";

import { Download, FileText, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/utils";

import type { MedicalDocument } from "../types";
import { documentTypeLabel } from "../utils";

type DocumentRowProps = {
  document: MedicalDocument;
  owner: string;
  onToggleShare: (shared: boolean) => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DocumentRow({
  document: doc,
  owner,
  onToggleShare,
  onDownload,
  onEdit,
  onDelete,
}: DocumentRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-4 p-4">
      <IconTile icon={FileText} tone="brand" />
      <div className="min-w-48 flex-1">
        <p className="truncate font-semibold text-ink">
          {doc.title}
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {documentTypeLabel(doc.type)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {owner} · {doc.document_date ? formatDate(doc.document_date) : "Sem data"}
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        Compartilhar com o assistente
        <Switch
          checked={doc.shared_with_assistant}
          onCheckedChange={onToggleShare}
          aria-label={`Compartilhar ${doc.title} com o assistente`}
        />
      </label>
      <div className="flex gap-1">
        {doc.has_file && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Baixar ${doc.title}`}
            onClick={onDownload}
          >
            <Download aria-hidden="true" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label={`Editar ${doc.title}`} onClick={onEdit}>
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          aria-label={`Excluir ${doc.title}`}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
