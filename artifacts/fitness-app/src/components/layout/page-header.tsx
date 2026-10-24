import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent page title block: sentence-case title, one line of context, optional action on the right. */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-8", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-medium leading-tight tracking-[-0.02em] md:text-[34px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
