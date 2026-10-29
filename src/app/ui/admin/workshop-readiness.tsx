import { Heading, Text } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { adminMicrocopy } from "./microcopy";

export interface ReadinessChecklistStep {
  readonly key: string;
  readonly label: string;
  readonly done: boolean;
  readonly href: string;
}

const copy = adminMicrocopy.workshops.readiness;

/**
 * The guided enrollment-readiness card: every prerequisite in order with a
 * text state (never color alone) and exactly one primary call to action, the
 * first step still missing.
 */
export function ReadinessChecklist({
  monthName,
  summary,
  complete,
  steps,
  next,
}: {
  monthName: string;
  summary: string;
  complete: boolean;
  steps: readonly ReadinessChecklistStep[];
  next: { cta: string; href: string } | null;
}) {
  const done = steps.filter((step) => step.done).length;
  return (
    <section
      aria-labelledby="readiness-title"
      className="flex max-w-prose flex-col gap-4 rounded-md bg-surface p-4 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <Heading level={2} id="readiness-title">
          {copy.title(monthName)}
        </Heading>
        <Text>{summary}</Text>
        <Text tone="muted">{copy.progress(done, steps.length)}</Text>
      </div>
      <ol className="flex flex-col gap-2">
        {steps.map((step) => (
          <li
            key={step.key}
            data-done={step.done ? "true" : "false"}
            className="flex flex-wrap items-baseline gap-x-3"
          >
            <span
              className={`min-w-20 text-sm font-semibold ${step.done ? "text-olive-800" : "text-terracotta-700"}`}
            >
              {step.done ? copy.done : copy.pending}
            </span>
            {step.done ? (
              <span className="text-ink-700">{step.label}</span>
            ) : (
              <a
                href={step.href}
                className="inline-flex min-h-11 items-center text-ink-900 underline underline-offset-4"
              >
                {step.label}
              </a>
            )}
          </li>
        ))}
      </ol>
      {complete ? null : next ? (
        <div>
          <AdminButtonLink href={next.href}>{next.cta}</AdminButtonLink>
        </div>
      ) : null}
    </section>
  );
}
