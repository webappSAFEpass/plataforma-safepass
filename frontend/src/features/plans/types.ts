// TEMPORÁRIO: espelha PlanOut do backend. Trocar por components["schemas"]["PlanOut"]
// de lib/api/schema.d.ts depois de rodar `pnpm api:types` com o backend no ar.
export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  price_cents: number;
  tier: number;
  max_dependents: number | null;
  monthly_review_limit: number | null;
  points_multiplier: number;
  highlighted: boolean;
  features: PlanFeature[];
}
