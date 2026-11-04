"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ScanLine, ShieldCheck, Ticket, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { normalizeCouponCode, validateCouponCode, type ValidationResult } from "../coupons";
import { validRedemption } from "../data";
import { couponCodeSchema, type CouponCodeValues } from "../schemas";

export function CouponValidator() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponCodeValues>({
    resolver: zodResolver(couponCodeSchema),
    defaultValues: { code: "" },
  });

  const field = register("code", {
    setValueAs: (value: string) => normalizeCouponCode(value),
    onChange: () => setResult(null),
  });

  const confirmUse = () => {
    toast.success("Uso confirmado com sucesso.");
    reset();
    setResult(null);
  };

  return (
    <Card className="relative overflow-hidden p-6 sm:p-10">
      <div className="absolute -top-24 -right-24 size-60 rounded-full bg-accent/15 blur-2xl" />
      <div className="relative">
        <IconTile icon={ScanLine} size="xl" className="mx-auto" />
        <div className="mx-auto mt-5 max-w-md text-center">
          <h2 className="font-display text-2xl font-extrabold tracking-[-.05em] text-primary">
            Validar benefício
          </h2>
          <p className="mt-2 text-sm leading-6 text-primary">
            Digite o código apresentado pelo paciente. A validação é instantânea e registra um único
            uso.
          </p>
        </div>
        <form
          noValidate
          onSubmit={handleSubmit(({ code }) =>
            setResult(validateCouponCode(code, validRedemption.code)),
          )}
          className="mx-auto mt-8 max-w-lg"
        >
          <Label htmlFor="coupon-code">Código do benefício</Label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Ticket
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-primary"
                aria-hidden="true"
              />
              <Input
                id="coupon-code"
                placeholder="Ex.: BEMESTAR15"
                autoComplete="off"
                aria-invalid={errors.code ? true : undefined}
                className="h-14 pl-11 font-display text-base font-extrabold tracking-[.08em] uppercase placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:normal-case"
                {...field}
              />
            </div>
            <Button type="submit" size="lg">
              Validar
            </Button>
          </div>
          {errors.code && (
            <p className="mt-1.5 text-xs font-semibold text-destructive">{errors.code.message}</p>
          )}
        </form>
        {result && (
          <div
            role="status"
            className={cn(
              "mx-auto mt-6 max-w-lg rounded-xl border p-4",
              result.status === "valid" ? "bg-success-soft" : "bg-destructive-soft/30",
            )}
          >
            <div className="flex gap-3">
              <IconTile
                icon={result.status === "valid" ? Check : X}
                tone={result.status === "valid" ? "positive" : "danger"}
                className="rounded-full"
              />
              {result.status === "valid" ? (
                <div>
                  <p className="text-sm font-extrabold text-primary">
                    Benefício válido — {validRedemption.discount}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-primary">
                    Paciente: {validRedemption.patient} · {validRedemption.service} · 1 uso será
                    registrado.
                  </p>
                  <Button variant="link" size="inline" className="mt-3" onClick={confirmUse}>
                    Confirmar uso <Check aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-extrabold text-destructive">
                    Não foi possível validar este código
                  </p>
                  <p className="mt-1 text-xs leading-5 text-destructive">
                    Confira se o código foi digitado corretamente, se ainda está válido ou se já foi
                    utilizado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <p className="mt-8 text-center text-xs text-primary">
          <ShieldCheck className="mr-1 inline size-3.5" aria-hidden="true" /> Dados protegidos e
          registro seguro pela SAFEpass
        </p>
      </div>
    </Card>
  );
}
