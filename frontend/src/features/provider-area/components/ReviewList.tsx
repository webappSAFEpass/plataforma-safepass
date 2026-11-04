import { Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ToastButton } from "@/components/ui/toast-button";

import { reviews } from "../data";
import { ReviewItem } from "./ReviewItem";

export function ReviewList() {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        title="Comentários dos pacientes"
        description="As avaliações são permanentes e não podem ser apagadas."
        action={
          <ToastButton
            variant="outline"
            size="sm"
            message="Filtro aberto"
            description="Todos os comentários estão sendo exibidos."
          >
            <Search aria-hidden="true" /> Filtrar
          </ToastButton>
        }
      />
      <div className="divide-y">
        {reviews.map((review) => (
          <ReviewItem key={review.author} review={review} />
        ))}
      </div>
    </Card>
  );
}
