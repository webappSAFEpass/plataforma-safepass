"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CircleAlert, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClassName } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { TextField } from "@/components/ui/text-field";

import { COUPON_FORM_ID } from "../constants";
import {
  couponFormSchema,
  DISCOUNT_TYPES,
  type CouponFormInput,
  type CouponFormValues,
} from "../schemas";

const DEFAULT_VALUES: CouponFormInput = {
  code: "EQUILIBRIO20",
  discountType: "percent",
  discountValue: "20",
  service: "Todos os serviços",
  validUntil: "2026-07-31",
  limit: "100",
};

export function CouponForm({ onCreate }: { onCreate: (values: CouponFormValues) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponFormInput, unknown, CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  return (
    <Card id={COUPON_FORM_ID} className="scroll-mt-24 p-5 sm:p-6">
      <SectionHeader icon={Plus} title="Novo benefício" description="Defina regras e validade." />
      <form noValidate onSubmit={handleSubmit(onCreate)} className="space-y-4">
        <TextField label="Código do benefício" error={errors.code?.message} {...register("code")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="coupon-discount-type">Tipo de desconto</Label>
            <select
              id="coupon-discount-type"
              className={inputClassName}
              {...register("discountType")}
            >
              {Object.entries(DISCOUNT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <TextField
            label="Valor"
            inputMode="numeric"
            error={errors.discountValue?.message}
            {...register("discountValue")}
          />
        </div>
        <TextField
          label="Serviço aplicável"
          error={errors.service?.message}
          {...register("service")}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Validade"
            type="date"
            error={errors.validUntil?.message}
            {...register("validUntil")}
          />
          <TextField
            label="Limite de usos"
            inputMode="numeric"
            error={errors.limit?.message}
            {...register("limit")}
          />
        </div>
        <p className="rounded-xl bg-success-soft p-3 text-xs leading-5 text-primary">
          <CircleAlert className="mr-1 inline size-3.5" aria-hidden="true" />O desconto será
          aplicado apenas para pacientes elegíveis SAFEpass.
        </p>
        <Button type="submit" className="w-full">
          <Check aria-hidden="true" /> Criar benefício
        </Button>
      </form>
    </Card>
  );
}
