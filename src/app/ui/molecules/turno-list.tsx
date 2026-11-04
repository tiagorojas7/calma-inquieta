import { Pill } from "../atoms/pill";

export function TurnoList({
  items,
}: {
  items: {
    key: string;
    weekday: string;
    timeRange: string;
    duration?: string;
    seats?: string;
    inquiry?: { href: string; label: string };
  }[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm bg-canvas px-3 py-2.5 text-ink-700"
        >
          <span className="font-display text-lg font-semibold text-ink-900">
            {item.weekday}
          </span>
          <span className="rounded-pill bg-sage-200 px-3 py-1 text-sm font-semibold tabular-nums text-olive-800">
            {item.timeRange}
          </span>
          {item.duration ? <span>{item.duration}</span> : null}
          {item.seats ? <Pill>{item.seats}</Pill> : null}
          {item.inquiry ? (
            <a
              href={item.inquiry.href}
              className="min-h-11 text-clay-800 underline underline-offset-4"
            >
              {item.inquiry.label}
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
