import { intensiveRequestCopy } from "./copy";

/**
 * The conditions block of the seat request form: the owner's policy text plus
 * the standing lines on cancellation for lack of minimum seats, the refund and
 * the no-show policy, so they are always visible before the visitor sends.
 */
export function requestConditions(input: {
  readonly policyText: string;
  readonly minSeats: number;
}) {
  const copy = intensiveRequestCopy.conditions;
  const policyText = input.policyText.trim();
  return {
    label: copy.label,
    policyText: policyText === "" ? copy.noPolicy : policyText,
    minSeats: [
      copy.cancellation.replace("{cantidad}", String(input.minSeats)),
      copy.noShow,
    ].join(" "),
  };
}
