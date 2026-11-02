import type { ReactNode } from "react";
import { Heading, Text } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { useAdminArea, AreaChip } from "./admin-area";
import { adminButtonClasses } from "./admin-button";

export interface AdminBreadcrumb {
  readonly label: string;
  readonly href?: string | undefined;
}

/**
 * "Volver a …" as a visible button, never a small text link. A plain anchor:
 * the Worker refuses the `.data` requests a client navigation would make.
 */
export function AdminBackButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      data-variant="secondary"
      data-role="back"
      className={`${adminButtonClasses.secondary} min-h-12 gap-2 self-start px-4`}
    >
      <Icon name="arrow-left" size={20} aria-hidden="true" />
      {label}
    </a>
  );
}

/**
 * Page header: the back button first, then the title. Inside an area (the
 * shell provides it) the title carries the area's colored icon chip, so each
 * screen says where you are at a glance; the header itself stays unfilled.
 */
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
  const area = useAdminArea();
  return (
    <header data-area={area} className="flex flex-col gap-3">
      {back ? <AdminBackButton href={back.href} label={back.label} /> : null}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Migas de pan">
          <ol className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-700">
            {breadcrumbs.map((breadcrumb, index) => {
              const current = index === breadcrumbs.length - 1;
              return (
                <li key={`${breadcrumb.label}-${String(index)}`}>
                  {breadcrumb.href && !current ? (
                    <a
                      className="inline-flex min-h-11 items-center underline underline-offset-4"
                      href={breadcrumb.href}
                    >
                      {breadcrumb.label}
                    </a>
                  ) : (
                    <span
                      aria-current={current ? "page" : undefined}
                      className="inline-flex min-h-11 items-center font-semibold text-ink-900"
                    >
                      {breadcrumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex items-center gap-3">
        {area ? <AreaChip area={area} size={28} /> : null}
        <Heading level={1}>{title}</Heading>
      </div>
      {description ? (
        area ? (
          <p className="text-base text-ink-700">{description}</p>
        ) : (
          <Text tone="muted">{description}</Text>
        )
      ) : null}
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
