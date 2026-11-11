"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";

import { services as initialServices } from "../data";
import { filterServices } from "../services";

export function ServicesTable() {
  const [services, setServices] = useState(initialServices);
  const [query, setQuery] = useState("");
  const visible = filterServices(services, query);

  const toggle = (code: string, available: boolean) =>
    setServices((current) =>
      current.map((item) => (item.code === code ? { ...item, available } : item)),
    );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-display text-lg font-extrabold tracking-[-.04em] text-primary">
            Tabela padrão SAFEpass
          </h2>
          <p className="mt-1 text-xs font-medium text-primary">
            Ative os serviços que sua clínica oferece.
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
            placeholder="Buscar serviço"
            aria-label="Buscar serviço"
            className="h-10 pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b text-[10px] font-extrabold tracking-[.08em] text-primary uppercase">
              <th scope="col" className="px-6 py-3.5">
                Serviço
              </th>
              <th scope="col" className="px-3 py-3.5">
                Categoria
              </th>
              <th scope="col" className="px-3 py-3.5">
                Duração
              </th>
              <th scope="col" className="px-3 py-3.5">
                Valor
              </th>
              <th scope="col" className="px-3 py-3.5">
                Modalidade
              </th>
              <th scope="col" className="px-6 py-3.5 text-right">
                Disponível
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((service) => (
              <tr
                key={service.code}
                className="border-b transition last:border-none hover:bg-muted/50"
              >
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-primary">{service.name}</p>
                  <p className="mt-1 text-xs text-primary">Código {service.code}</p>
                </td>
                <td className="px-3 py-4 text-sm font-medium text-primary">{service.category}</td>
                <td className="px-3 py-4 text-sm font-medium text-primary">
                  {service.durationMinutes} min
                </td>
                <td className="px-3 py-4 text-sm font-extrabold text-primary">
                  {formatCurrency(service.price)}
                </td>
                <td className="px-3 py-4">
                  <Badge tone="outline" className="border">
                    {service.modality}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Switch
                    checked={service.available}
                    onCheckedChange={(checked) => toggle(service.code, checked)}
                    aria-label={`Disponibilidade de ${service.name}`}
                  />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm font-medium text-primary">
                  Nenhum serviço encontrado para “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
