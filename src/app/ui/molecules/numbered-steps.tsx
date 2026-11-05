import { Icon } from "../atoms/icons";
import { VisuallyHidden } from "../atoms/visually-hidden";
import { stepCircleClasses, type StepState } from "./step-indicator";

function stateOf(at: number, current: number): StepState {
  if (at < current) return "done";
  return at === current ? "current" : "todo";
}

/**
 * A vertical list of what comes next. A rule joins the numbers and fills in
 * behind the finished steps; the state is also a shape and a word, never only
 * a colour.
 */
export function NumberedSteps({
  steps,
  current,
  currentLabel,
  labelledBy,
}: {
  steps: readonly string[];
  /** 0-based position of the step to do now. */
  current: number;
  currentLabel: string;
  labelledBy: string;
}) {
  return (
    <ol aria-labelledby={labelledBy} className="flex flex-col">
      {steps.map((step, at) => {
        const state = stateOf(at, current);
        return (
          <li
            key={step}
            data-state={state}
            {...(state === "current"
              ? { "aria-current": "step" as const }
              : {})}
            className="relative flex items-start gap-3 pb-5 last:pb-0"
          >
            {at < steps.length - 1 ? (
              <span
                aria-hidden="true"
                data-step-rule
                className={`absolute bottom-0 left-4 top-8 w-0.5 -translate-x-1/2 ${state === "done" ? "bg-clay-600" : "bg-tan-400"}`}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold tabular-nums ${stepCircleClasses[state]}`}
            >
              {state === "done" ? (
                <Icon name="check" className="size-4" />
              ) : (
                at + 1
              )}
            </span>
            <span className="flex flex-col gap-1 pt-1">
              {state === "current" ? (
                <span className="text-sm font-semibold text-clay-800">
                  {currentLabel}
                </span>
              ) : null}
              <span>
                {step}
                {state === "done" ? (
                  <VisuallyHidden> completado</VisuallyHidden>
                ) : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
