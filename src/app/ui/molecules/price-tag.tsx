export function PriceTag({
  label,
  amount,
  suffix,
}: {
  label?: string;
  amount: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <span className="text-sm font-semibold text-ink-600">{label}</span>
      ) : null}
      <p className="font-display text-h3 text-ink-900">
        {suffix ? `${amount} ${suffix}` : amount}
      </p>
    </div>
  );
}
