import { useState } from "react";
import { AdminButton as Button } from "./admin-button";
import { TextField } from "./form-fields";

/** A catalog variant an owner may add: active, available and priced. */
export interface EnrollmentMaterialChoice {
  readonly materialId: string;
  readonly variantId: string;
  readonly name: string;
  readonly label: string;
  /** Whole pesos. */
  readonly unitPrice: number;
  readonly priceLabel: string;
  /** Units the studio holds; none or absent means the variant is ordered from the supplier. */
  readonly onHand?: number;
}

/** A chosen variant as the form posts it: the quantity stays as typed. */
export interface EnrollmentMaterialLine {
  readonly materialId: string;
  readonly variantId: string;
  readonly quantity: string;
}

export const enrollmentMaterialsCopy = {
  legend: "Materiales (opcional)",
  hint: "Si no elegís ninguno, queda solo la cuota.",
  search: "Buscar material",
  searchHint: "Nombre o medida, por ejemplo: arcilla 5 kg.",
  typeToSearch: "Escribí para buscar.",
  noMatches: "No hay materiales con ese nombre.",
  noCatalog: "No hay materiales con precio.",
  inStock: (units: number) => `En stock: ${String(units)}`,
  toOrder: "A pedir",
  add: "Agregar",
  remove: "Quitar",
  quantity: "Cantidad",
  chosen: "Materiales elegidos",
  missing: "Material que ya no está disponible",
  summary: "Resumen",
  fee: "Cuota",
  materials: "Materiales",
  total: "Total",
} as const;

const copy = enrollmentMaterialsCopy;

/** Mirrors the server cart rule (1 to 20 whole units per variant). */
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;
/** Results shown at once, so a large catalog never floods a phone. */
const MAX_RESULTS = 8;

/** Lower case without accents, so "numero" finds "Número". */
const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const pesos = (amount: number): string =>
  `$ ${String(amount).replace(/\B(?=(\d{3})+$)/g, ".")}`;

/** The typed fee in whole pesos, or null when it is not a readable amount. */
function feeOf(typed: string): number | null {
  const compact = typed.replace(/[\s$]/g, "");
  return /^[0-9][0-9.]*$/.test(compact)
    ? Number(compact.replace(/\./g, ""))
    : null;
}

const keyOf = (line: { materialId: string; variantId: string }) =>
  `${line.materialId}:${line.variantId}`;

/** "En stock: N" while the studio holds units, otherwise the supplier path. */
const availabilityLabel = (choice: EnrollmentMaterialChoice): string =>
  choice.onHand !== undefined && choice.onHand > 0
    ? copy.inStock(choice.onHand)
    : copy.toOrder;

/**
 * Optional catalog materials of a hand-made enrollment. Each chosen variant is
 * a number input named `line:<material>:<variant>`, so the native form post
 * carries it; the search box has no name and is never posted.
 */
export function EnrollmentNewMaterials({
  choices,
  initialLines = [],
  fee,
  hint = copy.hint,
  legend = copy.legend,
  error,
}: {
  choices: readonly EnrollmentMaterialChoice[];
  initialLines?: readonly EnrollmentMaterialLine[];
  /**
   * The fee as typed in the form, to show one clear total. Absent for a
   * material sale, which has no fee: the materials are then its only total.
   */
  fee?: string | undefined;
  /** What the legend explains; a sale words it its own way. Empty shows nothing. */
  hint?: string;
  /** The group's name; a sale is not optional, so it words it its own way. */
  legend?: string;
  error?: string | undefined;
}) {
  const [lines, setLines] =
    useState<readonly EnrollmentMaterialLine[]>(initialLines);
  const [query, setQuery] = useState("");
  const choiceOf = (line: EnrollmentMaterialLine) =>
    choices.find((choice) => keyOf(choice) === keyOf(line));

  if (choices.length === 0 && lines.length === 0) {
    return (
      <fieldset className="flex flex-col gap-3 border-t border-admin-line pt-4">
        <legend className="font-semibold text-ink-900">{copy.legend}</legend>
        <p className="text-sm text-ink-700">{copy.noCatalog}</p>
      </fieldset>
    );
  }

  const chosenKeys = new Set(lines.map(keyOf));
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  const matches =
    tokens.length === 0
      ? []
      : choices.filter((choice) => {
          if (chosenKeys.has(keyOf(choice))) return false;
          const haystack = fold(`${choice.name} ${choice.label}`);
          return tokens.every((token) => haystack.includes(token));
        });
  const shown = matches.slice(0, MAX_RESULTS);

  const materialsTotal = lines.reduce((sum, line) => {
    const choice = choiceOf(line);
    return choice !== undefined && /^[0-9]+$/.test(line.quantity)
      ? sum + choice.unitPrice * Number(line.quantity)
      : sum;
  }, 0);
  const feeAmount = fee === undefined ? null : feeOf(fee);

  return (
    <fieldset className="flex flex-col gap-3 border-t border-admin-line pt-4">
      <legend className="font-semibold text-ink-900">{legend}</legend>
      {hint === "" ? null : <p className="text-sm text-ink-700">{hint}</p>}
      <TextField
        label={copy.search}
        hint={copy.searchHint}
        type="search"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          // Enter in the search box must never submit the enrollment.
          if (event.key === "Enter") event.preventDefault();
        }}
      />
      {tokens.length === 0 ? (
        <p className="text-sm text-ink-700">{copy.typeToSearch}</p>
      ) : shown.length === 0 ? (
        <p role="status" className="text-sm text-ink-700">
          {copy.noMatches}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((choice) => (
            <li
              key={keyOf(choice)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-admin-line p-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink-900">
                  {choice.name}
                </span>
                <span className="text-sm text-ink-700">
                  {choice.label} · {choice.priceLabel} ·{" "}
                  {availabilityLabel(choice)}
                </span>
              </div>
              <Button
                type="button"
                variant="success"
                aria-label={`${copy.add} ${choice.name} ${choice.label}`}
                onClick={() => {
                  setLines([
                    ...lines,
                    {
                      materialId: choice.materialId,
                      variantId: choice.variantId,
                      quantity: String(MIN_QUANTITY),
                    },
                  ]);
                }}
              >
                {copy.add}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {matches.length > shown.length && (
        <p className="text-sm text-ink-700">
          {`Mostrando ${String(shown.length)} de ${String(matches.length)}. Escribí más para afinar la búsqueda.`}
        </p>
      )}
      {lines.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-ink-900">{copy.chosen}</p>
          <ul className="flex flex-col gap-2">
            {lines.map((line) => {
              const choice = choiceOf(line);
              const title =
                choice === undefined
                  ? copy.missing
                  : `${choice.name} ${choice.label}`;
              return (
                <li
                  key={keyOf(line)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-sand-100 p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-semibold text-ink-900">
                      {choice?.name ?? copy.missing}
                    </span>
                    {choice !== undefined && (
                      <span className="text-sm text-ink-700">
                        {choice.label} · {choice.priceLabel} ·{" "}
                        {availabilityLabel(choice)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      name={`line:${keyOf(line)}`}
                      aria-label={`${copy.quantity} de ${title}`}
                      min={MIN_QUANTITY}
                      max={MAX_QUANTITY}
                      step={1}
                      value={line.quantity}
                      onChange={(event) => {
                        setLines(
                          lines.map((other) =>
                            keyOf(other) === keyOf(line)
                              ? { ...other, quantity: event.target.value }
                              : other,
                          ),
                        );
                      }}
                      className="min-h-11 w-24 rounded-sm border border-clay-600 bg-surface px-3 py-2 text-base text-ink-900"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`${copy.remove} ${title}`}
                      onClick={() => {
                        setLines(
                          lines.filter((other) => keyOf(other) !== keyOf(line)),
                        );
                      }}
                    >
                      {copy.remove}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div
            role="group"
            aria-label={copy.summary}
            aria-live="polite"
            className="flex flex-col gap-1 rounded-md bg-sand-200 p-3"
          >
            <dl className="flex flex-col gap-1 text-ink-900">
              {feeAmount !== null && (
                <SummaryRow label={copy.fee} value={pesos(feeAmount)} />
              )}
              {fee === undefined ? null : (
                <SummaryRow
                  label={copy.materials}
                  value={pesos(materialsTotal)}
                />
              )}
              {fee === undefined && (
                <SummaryRow
                  label={copy.total}
                  value={pesos(materialsTotal)}
                  strong
                />
              )}
              {feeAmount !== null && (
                <SummaryRow
                  label={copy.total}
                  value={pesos(feeAmount + materialsTotal)}
                  strong
                />
              )}
            </dl>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-terracotta-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
