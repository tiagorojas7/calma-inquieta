import type { ReactNode } from "react";
import { Heading } from "../atoms/heading";

/** A solid sheet of facts: a heading and a definition list of `ReceiptFact`. */
export function Receipt({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-md bg-white p-6 shadow-card"
    >
      <Heading level={2} id={id}>
        {heading}
      </Heading>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2">
        {children}
      </dl>
    </section>
  );
}

export function ReceiptFact({
  label,
  numeric = false,
  children,
}: {
  label: string;
  /** Amounts line up on tabular numerals. */
  numeric?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-sm font-semibold text-ink-600">{label}</dt>
      <dd className={`text-right ${numeric ? "tabular-nums" : ""}`.trim()}>
        {children}
      </dd>
    </>
  );
}
