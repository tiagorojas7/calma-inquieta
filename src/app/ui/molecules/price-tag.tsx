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
        <span className="text-eyebrow font-semibold uppercase tracking-eyebrow text-terracotta-700">
          {label}
        </span>
      ) : null}
      <p className="font-display text-h3 font-semibold text-ink-900">
        {suffix ? `${amount} ${suffix}` : amount}
      </p>
    </div>
  );
}
