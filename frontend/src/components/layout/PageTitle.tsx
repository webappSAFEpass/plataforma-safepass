import type { ReactNode } from "react";

type PageTitleProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageTitle({ eyebrow, title, description, action }: PageTitleProps) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-[10px] font-extrabold tracking-[.16em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.055em] text-primary sm:text-[34px]">
          {title}
        </h1>
        <p className="mt-2 text-sm font-medium text-primary">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
