"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { ToastButton } from "@/components/ui/toast-button";
import { formatDate } from "@/lib/utils";

import { addCertificate, CertificateTooLargeError } from "../certificates";
import { certificates as initialCertificates } from "../data";
import type { CertificateStatus } from "../types";
import { CertificateUpload } from "./CertificateUpload";

const STATUS_LABEL: Record<CertificateStatus, string> = {
  review: "Em análise",
  organized: "Organizado",
};

export function CertificatesManager() {
  const [certificates, setCertificates] = useState(initialCertificates);

  const upload = (file: File) => {
    let next;
    try {
      next = addCertificate(certificates, file, new Date());
    } catch (error) {
      if (error instanceof CertificateTooLargeError) {
        toast.error(error.message);
        return;
      }
      throw error;
    }
    setCertificates(next);
    toast.success("Arquivo enviado e aguardando organização.");
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <div className="space-y-5">
        <CertificateUpload onFile={upload} />
        <Card className="p-5">
          <p className="text-[10px] font-extrabold tracking-[.09em] text-primary uppercase">
            Confidencialidade
          </p>
          <p className="mt-2 text-sm leading-6 text-primary">
            Apenas profissionais autorizados de RH visualizam estes documentos, seguindo práticas de
            segurança e privacidade.
          </p>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-[-.04em] text-primary">
              Documentos recentes
            </h2>
            <p className="mt-1 text-xs text-primary">Acompanhe o status da organização.</p>
          </div>
        </div>
        <ul className="divide-y">
          {certificates.map((certificate) => (
            <li
              key={`${certificate.fileName}-${certificate.receivedAt}`}
              className="flex items-center gap-3 p-4 sm:px-6"
            >
              <IconTile icon={FileText} tone="warning" size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-primary">{certificate.fileName}</p>
                <p className="mt-1 text-xs text-primary">
                  {certificate.employee} · {certificate.area} · {formatDate(certificate.receivedAt)}
                </p>
              </div>
              <Badge
                tone={certificate.status === "organized" ? "success" : "warning"}
                className="hidden sm:inline-flex"
              >
                {STATUS_LABEL[certificate.status]}
              </Badge>
              <ToastButton
                variant="ghost"
                size="icon"
                className="hover:bg-success-soft"
                message="Visualização em breve"
                aria-label={`Abrir ${certificate.fileName}`}
              >
                <ExternalLink aria-hidden="true" />
              </ToastButton>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
