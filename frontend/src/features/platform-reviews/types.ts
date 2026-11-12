// TEMPORÁRIO: espelha os schemas de platform_reviews do backend (ver nota em plans/types.ts).
export type ReviewerProfile = "visitor" | "user" | "provider" | "company";

export interface PublicReview {
  id: string;
  author_name: string;
  reviewer_profile: ReviewerProfile;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const PROFILE_LABELS: Record<ReviewerProfile, string> = {
  visitor: "Visitante",
  user: "Usuário",
  provider: "Prestador",
  company: "Empresa",
};
