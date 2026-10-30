import { useEffect, useRef } from "react";

export interface SummarizedError {
  readonly fieldId: string;
  readonly message: string;
}

/**
 * Linked list of the failed fields. It is the one live region of a failed
 * submit: it takes focus when the errors change, so a keyboard or screen
 * reader user lands on it, and each message jumps to its field.
 */
export function ErrorSummary({
  title,
  errors,
}: {
  title: string;
  errors: readonly SummarizedError[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const signature = errors
    .map((error) => `${error.fieldId}:${error.message}`)
    .join("|");
  useEffect(() => {
    if (signature) ref.current?.focus();
  }, [signature]);
  if (errors.length === 0) return null;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-md border-2 border-terracotta-700 bg-surface p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
    >
      <p className="font-semibold text-terracotta-700">{title}</p>
      <ul className="mt-2 flex flex-col">
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              className="inline-flex min-h-11 items-center text-ink-900 underline underline-offset-4"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
