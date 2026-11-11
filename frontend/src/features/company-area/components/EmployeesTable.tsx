import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

import type { Employee, EmployeeStatus } from "../types";

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: "Ativo",
  invited: "Convite enviado",
};

type EmployeesTableProps = {
  employees: Employee[];
  query: string;
  onRemove: (employee: Employee) => void;
};

export function EmployeesTable({ employees, query, onRemove }: EmployeesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b text-[10px] font-extrabold tracking-[.08em] text-primary uppercase">
            <th scope="col" className="px-6 py-3.5">
              Colaborador
            </th>
            <th scope="col" className="px-3 py-3.5">
              Área
            </th>
            <th scope="col" className="px-3 py-3.5">
              E-mail
            </th>
            <th scope="col" className="px-3 py-3.5">
              Status
            </th>
            <th scope="col" className="px-6 py-3.5">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr
              key={employee.email}
              className="border-b transition last:border-none hover:bg-muted/50"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="grid size-9 place-items-center rounded-full bg-success-soft text-[11px] font-extrabold text-primary"
                    aria-hidden="true"
                  >
                    {initials(employee.name)}
                  </div>
                  <p className="text-sm font-bold text-primary">{employee.name}</p>
                </div>
              </td>
              <td className="px-3 py-4 text-sm font-medium text-primary">{employee.area}</td>
              <td className="px-3 py-4 text-sm font-medium text-primary">{employee.email}</td>
              <td className="px-3 py-4">
                <Badge tone={employee.status === "active" ? "success" : "warning"}>
                  {STATUS_LABEL[employee.status]}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-destructive-soft hover:text-destructive"
                  onClick={() => onRemove(employee)}
                  aria-label={`Remover ${employee.name}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-sm font-medium text-primary">
                {query
                  ? `Nenhum colaborador encontrado para “${query}”.`
                  : "Nenhum colaborador cadastrado."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
