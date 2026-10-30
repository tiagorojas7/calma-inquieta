const stepButton =
  "grid size-11 shrink-0 place-items-center rounded-full border border-clay-600 text-xl leading-none text-clay-800 transition-colors hover:bg-sand-200 active:bg-sand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";

/**
 * Quantity control with explicit 44 px decrement and increment buttons and
 * direct numeric entry. The native spinner is hidden (`qty-input`) because
 * the buttons replace it; it never clamps, the owner of the value does.
 */
export function QuantityStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  /** Names the item in the accessible labels, e.g. "Arcilla Grande". */
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={stepButton}
        aria-label={`Disminuir cantidad de ${label}`}
        disabled={value <= min}
        onClick={() => {
          onChange(value - 1);
        }}
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        aria-label={`Cantidad para ${label}`}
        className="qty-input min-h-11 w-16 rounded-sm border border-clay-600 bg-surface px-2 text-center text-base tabular-nums text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
        inputMode="numeric"
        max={max}
        min={min}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        type="number"
        value={value}
      />
      <button
        type="button"
        className={stepButton}
        aria-label={`Aumentar cantidad de ${label}`}
        disabled={value >= max}
        onClick={() => {
          onChange(value + 1);
        }}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
