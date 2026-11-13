import type { ReactNode } from 'react';

/** The page title (the only h1), an optional line under it and an optional row of actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-heading text-[26px] leading-9 font-extrabold tracking-[-0.02em] break-words lg:text-[34px] lg:leading-[42px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-on-surface/70 lg:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
