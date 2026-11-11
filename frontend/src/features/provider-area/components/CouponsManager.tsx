"use client";

import { CheckCircle2, HeartPulse, Ticket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatCard } from "@/components/ui/stat-card";
import { formatNumber } from "@/lib/utils";

import { addCoupon, couponLabel } from "../coupons";
import { couponMetrics, coupons as initialCoupons } from "../data";
import type { CouponFormValues } from "../schemas";
import { CouponForm } from "./CouponForm";
import { CouponList } from "./CouponList";

export function CouponsManager() {
  const [coupons, setCoupons] = useState(initialCoupons);

  const create = (values: CouponFormValues) => {
    const next = addCoupon(coupons, {
      code: values.code,
      label: couponLabel(values.discountType, values.discountValue, values.service),
      used: 0,
      limit: values.limit,
      validUntil: values.validUntil,
    });
    if (next === coupons) {
      toast.error("Já existe um benefício com esse código.");
      return;
    }
    setCoupons(next);
    toast.success("Benefício criado e pronto para divulgar.");
  };

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Indicadores de benefícios">
        <StatCard
          icon={Ticket}
          label="Benefícios ativos"
          value={formatNumber(coupons.length)}
          foot="Disponíveis agora"
        />
        <StatCard
          icon={CheckCircle2}
          label="Usos no mês"
          value={formatNumber(couponMetrics.usesThisMonth)}
          foot="+22% vs. mês anterior"
        />
        <StatCard
          icon={HeartPulse}
          label="Novos pacientes"
          value={formatNumber(couponMetrics.newPatients)}
          foot="Vieram por benefícios"
        />
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <CouponList coupons={coupons} />
        <CouponForm onCreate={create} />
      </section>
    </>
  );
}
