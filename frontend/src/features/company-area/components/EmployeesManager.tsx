"use client";

import { CircleAlert, Search, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { employees as initialEmployees } from "../data";
import { filterEmployees, inviteEmployee } from "../employees";
import type { EmployeeInviteValues } from "../schemas";
import type { Employee } from "../types";
import { EmployeeInviteForm } from "./EmployeeInviteForm";
import { EmployeesTable } from "./EmployeesTable";

export function EmployeesManager() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const invite = (values: EmployeeInviteValues) => {
    const next = inviteEmployee(employees, values);
    if (next === employees) {
      toast.error("Esse e-mail já está cadastrado.");
      return false;
    }
    setEmployees(next);
    setShowForm(false);
    toast.success("Convite enviado ao novo colaborador.");
    return true;
  };

  const remove = (employee: Employee) => {
    setEmployees((current) => current.filter((item) => item.email !== employee.email));
    toast.success("Acesso do colaborador removido.");
  };

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button onClick={() => setShowForm((open) => !open)} aria-expanded={showForm}>
          {showForm ? <X aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
          {showForm ? "Cancelar convite" : "Adicionar colaborador"}
        </Button>
      </div>
      {showForm && <EmployeeInviteForm onInvite={invite} />}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-[-.04em] text-primary">
              Lista de colaboradores
            </h2>
            <p className="mt-1 text-xs text-primary">
              {employees.length} pessoas registradas no benefício.
            </p>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar colaborador"
              aria-label="Buscar colaborador"
              className="h-10 pl-9"
            />
          </div>
        </div>
        <EmployeesTable
          employees={filterEmployees(employees, query)}
          query={query}
          onRemove={remove}
        />
      </Card>
      <p className="mt-3 text-xs text-primary">
        <CircleAlert className="mr-1 inline size-3.5" aria-hidden="true" /> Ao remover uma pessoa, o
        acesso aos benefícios SAFEpass é desativado imediatamente.
      </p>
    </>
  );
}
