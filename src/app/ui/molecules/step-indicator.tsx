/**
 * "Paso N de M" in words plus a numbered list, so the position never depends
 * on color: the current step is bold, filled and `aria-current="step"`.
 */
export function StepIndicator({
  steps,
  current,
}: {
  steps: readonly string[];
  /** 1-based position of the current step. */
  current: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink-600">
        {`Paso ${String(current)} de ${String(steps.length)}`}
      </p>
      <ol className="flex flex-wrap gap-x-4 gap-y-1">
        {steps.map((step, at) => {
          const active = at + 1 === current;
          return (
            <li
              key={step}
              {...(active ? { "aria-current": "step" as const } : {})}
              className={`flex items-center gap-2 text-sm ${active ? "font-semibold text-ink-900" : "text-ink-600"}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-6 place-items-center rounded-full border text-xs ${active ? "border-clay-600 bg-clay-600 text-white" : "border-clay-600 text-clay-800"}`}
              >
                {at + 1}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
