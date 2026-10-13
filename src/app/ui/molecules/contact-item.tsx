import { Icon } from "../atoms/icon";
import type { ComponentProps } from "react";
export function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} aria-hidden="true" className="mt-1 text-clay-800" />
      <div className="flex flex-col">
        <span className="font-semibold text-ink-900">{label}</span>
        {href ? (
          <a
            className="text-clay-800 underline underline-offset-4"
            href={href}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {value}
          </a>
        ) : (
          <span>{value}</span>
        )}
      </div>
    </div>
  );
}
export function TrustItem({
  icon,
  label,
}: {
  icon: ComponentProps<typeof Icon>["name"];
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-ink-900">
      <Icon name={icon} aria-hidden="true" className="text-clay-800" />
      <span>{label}</span>
    </div>
  );
}
export function DateBadge({ date }: { date: string }) {
  const d = new Date(`${date}T00:00:00Z`);
  return (
    <time
      className="flex min-w-14 flex-col items-center text-center font-semibold uppercase text-clay-800"
      dateTime={date}
      aria-label={d.toLocaleDateString("es-AR", {
        dateStyle: "full",
        timeZone: "UTC",
      })}
    >
      <span>{String(d.getUTCDate()).padStart(2, "0")}</span>
      <span>
        {d.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" })}
      </span>
    </time>
  );
}
