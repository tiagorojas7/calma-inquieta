import { Heading, Text } from "../atoms/heading";
import { ADMIN_NAV } from "./admin-nav";
import { adminMicrocopy } from "./microcopy";

/** Greeting and shortcuts to the areas. No metrics: a dashboard is another change. */
export function AdminLanding({ email }: { email: string }) {
  const copy = adminMicrocopy.landing;
  return (
    <section className="flex flex-col gap-4">
      <Heading level={1}>{copy.title}</Heading>
      <Text>{copy.greeting(email)}</Text>
      <Text tone="muted">{copy.intro}</Text>
      <ul className="grid gap-3 sm:grid-cols-2">
        {ADMIN_NAV.map((entry) => (
          <li key={entry.href}>
            <a
              href={entry.href}
              className="flex min-h-11 items-center rounded-md bg-surface p-4 font-display text-h3 text-ink-900 shadow-card hover:bg-sand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
