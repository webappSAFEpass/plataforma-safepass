"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { cn, initials } from "@/lib/utils";

import { team as initialTeam } from "../data";

export function TeamList() {
  const [team, setTeam] = useState(initialTeam);

  const remove = (name: string, isAdmin: boolean) => {
    if (isAdmin) {
      toast.error("A administradora principal não pode ser removida.");
      return;
    }
    setTeam((current) => current.filter((member) => member.name !== name));
    toast.success("Profissional removido da equipe.");
  };

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        title="Profissionais vinculados"
        description={`${team.length} pessoas com acesso à clínica.`}
      />
      <ul className="space-y-3">
        {team.map((member) => (
          <li
            key={member.name}
            className="flex items-center gap-3 rounded-xl border p-3.5 transition hover:bg-muted/50"
          >
            <div
              className={cn(
                "grid size-10 place-items-center rounded-full border text-xs font-extrabold text-primary",
                member.isAdmin ? "bg-accent" : "bg-card",
              )}
              aria-hidden="true"
            >
              {initials(member.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold text-primary">{member.name}</p>
                {member.isAdmin && (
                  <ShieldCheck
                    className="size-4 shrink-0 text-primary"
                    aria-label="Administradora"
                  />
                )}
              </div>
              <p className="mt-0.5 text-xs text-primary">{member.role}</p>
            </div>
            <Badge tone={member.isAdmin ? "brand" : "neutral"} className="hidden sm:inline-flex">
              {member.isAdmin ? "Administradora" : "Ativo"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-destructive-soft hover:text-destructive"
              onClick={() => remove(member.name, member.isAdmin)}
              aria-label={`Remover ${member.name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
