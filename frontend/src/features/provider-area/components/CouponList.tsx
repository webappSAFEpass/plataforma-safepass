"use client";

import { Copy, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Progress } from "@/components/ui/progress";
import { SectionHeader } from "@/components/ui/section-header";
import { formatDate } from "@/lib/utils";

import { couponUsageLabel } from "../coupons";
import type { Coupon } from "../types";

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  } catch {
    toast.error("Não foi possível copiar o código.");
  }
}

export function CouponList({ coupons }: { coupons: Coupon[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        title="Benefícios em circulação"
        description="Acompanhe o desempenho de cada benefício."
      />
      <ul className="space-y-3">
        {coupons.map((coupon) => (
          <li key={coupon.code} className="relative overflow-hidden rounded-xl border bg-card p-4">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="flex gap-3">
              <IconTile icon={Ticket} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-extrabold tracking-[-.02em] text-primary">
                      {coupon.code}
                    </p>
                    <p className="mt-0.5 text-xs text-primary">{coupon.label}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 hover:bg-success-soft"
                    onClick={() => copyCode(coupon.code)}
                    aria-label={`Copiar código ${coupon.code}`}
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress
                    value={coupon.used}
                    max={coupon.limit}
                    label={`Usos de ${coupon.code}`}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-extrabold text-primary">
                    {couponUsageLabel(coupon)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-semibold text-primary">
                  <span>Válido até {formatDate(coupon.validUntil)}</span>
                  <span>Ativo</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
