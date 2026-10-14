import { Heading } from "../atoms/heading";

/** Always visible: a plain block, never a collapsed `<details>`. */
export function ConditionsNote({
  label,
  policyText,
  minSeats,
}: {
  label: string;
  policyText: string;
  minSeats?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-sand-100 p-4">
      <Heading level={3} size="h4">
        {label}
      </Heading>
      <p className="whitespace-pre-line text-ink-700">{policyText}</p>
      {minSeats ? <p className="text-ink-700">{minSeats}</p> : null}
    </div>
  );
}
