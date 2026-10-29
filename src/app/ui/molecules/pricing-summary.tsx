type Amount = { label: string; amount: string };

/**
 * Total, reservation amount and remaining balance as an aligned definition
 * list; the reservation amount is marked by weight and a rule, not by color.
 */
export function PricingSummary({
  total,
  reservation,
  balance,
}: {
  total: Amount;
  reservation: Amount;
  balance?: Amount;
}) {
  return (
    <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2">
      <dt className="text-sm font-semibold text-ink-600">{total.label}</dt>
      <dd className="text-right font-display text-h3 tabular-nums text-ink-900">
        {total.amount}
      </dd>
      <dt className="border-t border-sand-300 pt-2 text-sm font-semibold text-ink-900">
        {reservation.label}
      </dt>
      <dd className="border-t border-sand-300 pt-2 text-right font-semibold tabular-nums text-ink-900">
        {reservation.amount}
      </dd>
      {balance ? (
        <>
          <dt className="text-sm text-ink-600">{balance.label}</dt>
          <dd className="text-right tabular-nums text-ink-700">
            {balance.amount}
          </dd>
        </>
      ) : null}
    </dl>
  );
}
