import type { Employee } from "./types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Filtra por nome, área ou e-mail. Busca vazia devolve a lista inteira. */
export function filterEmployees(list: Employee[], query: string): Employee[] {
  const term = normalize(query);
  if (!term) return list;
  return list.filter((employee) =>
    [employee.name, employee.area, employee.email].some((field) => normalize(field).includes(term)),
  );
}

/** Convida sem duplicar e-mail já cadastrado. Devolve a mesma lista quando já existe. */
export function inviteEmployee(list: Employee[], invite: Omit<Employee, "status">): Employee[] {
  const email = invite.email.toLowerCase();
  if (list.some((employee) => employee.email === email)) return list;
  return [...list, { ...invite, email, status: "invited" }];
}
