import { Icon } from "../atoms/icons";
import { VisuallyHidden } from "../atoms/visually-hidden";

export type StepState = "done" | "current" | "todo";

export const stepCircleClasses: Record<StepState, string> = {
  done: "border-olive-800 bg-sage-200 text-olive-800",
  current: "border-clay-600 bg-clay-600 text-white shadow-button",
  todo: "border-clay-600 text-clay-800",
};

/**
 * "Paso N de M" in words plus a numbered list, so the position never depends
 * on color. Each step has a state that is also a shape: a finished step shows
 * a check (and says "completado" to a screen reader), the current step is
 * bold, filled and `aria-current="step"`, and the next ones stay outlined. A
 * rule joins the steps and fills in as they are finished.
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
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink-700">
        {`Paso ${String(current)} de ${String(steps.length)}`}
      </p>
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {steps.map((step, at) => {
          const position = at + 1;
          const state: StepState =
            position < current
              ? "done"
              : position === current
                ? "current"
                : "todo";
          return (
            <li
              key={step}
              data-state={state}
              {...(state === "current"
                ? { "aria-current": "step" as const }
                : {})}
              className={`flex items-center gap-2 text-sm ${state === "current" ? "font-semibold text-ink-900" : "text-ink-700"}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-8 place-items-center rounded-full border-2 text-sm font-semibold ${stepCircleClasses[state]}`}
              >
                {state === "done" ? (
                  <Icon name="check" className="size-4" />
                ) : (
                  position
                )}
              </span>
              {step}
              {state === "done" ? (
                <VisuallyHidden> completado</VisuallyHidden>
              ) : null}
              {at < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  data-connector
                  className={`ml-1 h-0.5 w-6 rounded-pill ${state === "done" ? "bg-clay-600" : "bg-tan-400"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
