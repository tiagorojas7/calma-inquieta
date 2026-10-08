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
    <div>
      <Icon name={icon} aria-hidden="true" />
      <span>{label}</span>
      {href ? (
        <a
          href={href}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
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
    <div>
      <Icon name={icon} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
export function DateBadge({ date }: { date: string }) {
  const d = new Date(`${date}T00:00:00Z`);
  return (
    <time
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
