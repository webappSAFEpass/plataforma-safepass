import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type QueryStateProps = {
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  empty: ReactNode;
  onRetry: () => void;
  children: ReactNode;
};

/** Loading (skeleton), erro com "Tentar novamente" e vazio, como pede o padrão do front. */
export function QueryState({
  isPending,
  isError,
  isEmpty,
  empty,
  onRetry,
  children,
}: QueryStateProps) {
  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold text-primary">Não foi possível carregar.</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      </Card>
    );
  }
  if (isEmpty) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">{empty}</Card>;
  }
  return <>{children}</>;
}
