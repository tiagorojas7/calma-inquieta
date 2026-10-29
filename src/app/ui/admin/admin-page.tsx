import type { ReactNode } from "react";
import { Heading, Text } from "../atoms/heading";

export interface AdminBreadcrumb {
  readonly label: string;
  readonly href?: string | undefined;
}

export function AdminPageHeader({
  title,
  description,
  back,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: ReactNode | undefined;
  back?: { href: string; label: string } | undefined;
  breadcrumbs?: readonly AdminBreadcrumb[] | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <header className="flex flex-col gap-3">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Migas de pan">
          <ol className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-600">
            {breadcrumbs.map((breadcrumb, index) => {
              const current = index === breadcrumbs.length - 1;
              return (
                <li key={`${breadcrumb.label}-${String(index)}`}>
                  {breadcrumb.href && !current ? (
                    <a
                      className="underline underline-offset-4"
                      href={breadcrumb.href}
                    >
                      {breadcrumb.label}
                    </a>
                  ) : (
                    <span aria-current={current ? "page" : undefined}>
                      {breadcrumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      {back ? (
        <div>
          <a
            className="inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4"
            href={back.href}
          >
            {back.label}
          </a>
        </div>
      ) : null}
      <Heading level={1}>{title}</Heading>
      {description ? <Text tone="muted">{description}</Text> : null}
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

export function AdminPageActions({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode | undefined;
}) {
  return (
    <div
      aria-label="Acciones"
      className="flex flex-wrap items-center gap-3"
      role="group"
    >
      <div>{primary}</div>
      {secondary ? <div>{secondary}</div> : null}
    </div>
  );
}

export function AdminFeedback({
  tone,
  title,
  message,
  children,
}: {
  tone: "success" | "info" | "error";
  title: string;
  message?: ReactNode | undefined;
  children?: ReactNode | undefined;
}) {
  const role = tone === "error" ? "alert" : "status";
  const color = tone === "error" ? "text-terracotta-700" : "text-ink-900";
  return (
    <section className={`rounded-md bg-sand-200 p-3 ${color}`} role={role}>
      <p className="font-semibold">{title}</p>
      {message ? <p>{message}</p> : null}
      {children ? <> {children}</> : null}
    </section>
  );
}
