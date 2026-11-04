import type { Service } from "./types";

/** Remove acentos e caixa para a busca não depender de como o usuário digita. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Filtra por nome, código ou categoria. Busca vazia devolve a lista inteira. */
export function filterServices(list: Service[], query: string): Service[] {
  const term = normalize(query);
  if (!term) return list;
  return list.filter((service) =>
    [service.name, service.code, service.category].some((field) => normalize(field).includes(term)),
  );
}
