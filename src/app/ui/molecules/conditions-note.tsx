import { Heading } from "../atoms/heading";

/** Always visible: a plain block, never a collapsed `<details>`. */
export function ConditionsNote({
  label,
  policyText,
  minSeats,
  level = 3,
}: {
  label: string;
  policyText: string;
  minSeats?: string;
  /** `2` when the note is a top-level section of a page. */
  level?: 2 | 3;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-sand-100 p-4">
      <Heading level={level} size="h4">
        {label}
      </Heading>
      <p className="whitespace-pre-line text-ink-700">{policyText}</p>
      {minSeats ? <p className="text-ink-700">{minSeats}</p> : null}
    </div>
  );
}
