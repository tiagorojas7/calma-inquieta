import { useState } from "react";
import { AdminButton as Button } from "./admin-button";
import { TextField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensives.projects.materials;

/** A catalog variant the owner may add. `onHand` is null when stock could not be read. */
export interface ProjectMaterialChoice {
  readonly variantId: string;
  readonly name: string;
  readonly label: string;
  readonly onHand: number | null;
}

/**
 * One line of a project's list. `name` and `label` are null when the variant
 * is no longer in the catalog: the line stays visible so it can be removed.
 */
export interface ProjectMaterialLine {
  readonly variantId: string;
  readonly name: string | null;
  readonly label: string | null;
  readonly quantity: number;
  readonly onHand: number | null;
}

/** Mirrors the domain rule: 1 to 20 whole units per participant. */
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;
/** Results shown at once, so a large catalog never floods a phone. */
const MAX_RESULTS = 8;

const SUMMARY =
  "inline-flex min-h-11 cursor-pointer items-center font-semibold text-clay-800 underline underline-offset-4";
const QUANTITY_INPUT =
  "min-h-11 w-24 rounded-sm border border-clay-600 bg-surface px-3 py-2 text-base text-ink-900";

/** Lower case without accents, so "numero" finds "Número". */
const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const titleOf = (line: { name: string | null; label: string | null }) =>
  line.name === null ? copy.missing : `${line.name} ${line.label ?? ""}`.trim();

function stockOf(onHand: number | null): string | null {
  return onHand === null ? null : copy.inStock(onHand);
}

function QuantityInput({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: number;
  label: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      name={name}
      aria-label={label}
      min={MIN_QUANTITY}
      max={MAX_QUANTITY}
      step={1}
      defaultValue={defaultValue}
      className={QUANTITY_INPUT}
    />
  );
}

/**
 * The bill of materials of one project: the catalog variants and the units
 * each participant uses. The price already covers them and stock is shown
 * for information only. Every change is a native post form (quantity,
 * remove, add); only the catalog search runs in the browser.
 */
export function ProjectMaterials({
  projectId,
  projectName,
  lines,
  choices,
  error,
}: {
  projectId: string;
  projectName: string;
  lines: readonly ProjectMaterialLine[];
  choices: readonly ProjectMaterialChoice[];
  /** A refusal of this project's list, such as a duplicated variant. */
  error?: string | undefined;
}) {
  const [query, setQuery] = useState("");
  const listed = new Set(lines.map((line) => line.variantId));
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  const matches =
    tokens.length === 0
      ? []
      : choices.filter((choice) => {
          if (listed.has(choice.variantId)) return false;
          const haystack = fold(`${choice.name} ${choice.label}`);
          return tokens.every((token) => haystack.includes(token));
        });
  const shown = matches.slice(0, MAX_RESULTS);
  const addable = choices.some((choice) => !listed.has(choice.variantId));

  return (
    <div className="flex flex-col gap-3 border-t border-admin-line pt-3">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink-900">{copy.title}</p>
        <p className="text-sm text-ink-700">{copy.hint}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-terracotta-700">
          {error}
        </p>
      )}
      {lines.length === 0 ? (
        <p className="text-sm text-ink-700">{copy.empty}</p>
      ) : (
        <div
          role="group"
          aria-label={copy.listLabel(projectName)}
          className="flex flex-col gap-2"
        >
          {lines.map((line) => {
            const title = titleOf(line);
            const stock = stockOf(line.onHand);
            return (
              <div
                key={line.variantId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-sand-100 p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-semibold text-ink-900">
                    {line.name ?? copy.missing}
                  </span>
                  {line.name !== null && (
                    <span className="text-sm text-ink-700">
                      {[line.label, stock].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form method="post" className="flex items-center gap-2">
                    <input
                      type="hidden"
                      name="intent"
                      value="project-material-set"
                    />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId}
                    />
                    <QuantityInput
                      name="quantity"
                      defaultValue={line.quantity}
                      label={copy.quantityName(title)}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      aria-label={copy.saveQuantityName(title)}
                    >
                      {copy.saveQuantity}
                    </Button>
                  </form>
                  <form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value="project-material-remove"
                    />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="variantId"
                      value={line.variantId}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      aria-label={copy.removeName(title, projectName)}
                    >
                      {copy.remove}
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <details>
        <summary className={SUMMARY}>{copy.addSummary}</summary>
        <div className="mt-3 flex flex-col gap-3">
          {!addable ? (
            <p className="text-sm text-ink-700">{copy.noCatalog}</p>
          ) : (
            <>
              <TextField
                label={copy.search}
                hint={copy.searchHint}
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
              {tokens.length === 0 ? (
                <p className="text-sm text-ink-700">{copy.typeToSearch}</p>
              ) : shown.length === 0 ? (
                <p role="status" className="text-sm text-ink-700">
                  {copy.noMatches}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {shown.map((choice) => {
                    const title = `${choice.name} ${choice.label}`;
                    const stock = stockOf(choice.onHand);
                    return (
                      <form
                        key={choice.variantId}
                        method="post"
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-admin-line p-3"
                      >
                        <input
                          type="hidden"
                          name="intent"
                          value="project-material-add"
                        />
                        <input
                          type="hidden"
                          name="projectId"
                          value={projectId}
                        />
                        <input
                          type="hidden"
                          name="variantId"
                          value={choice.variantId}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="font-semibold text-ink-900">
                            {choice.name}
                          </span>
                          <span className="text-sm text-ink-700">
                            {[choice.label, stock].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <QuantityInput
                            name="quantity"
                            defaultValue={MIN_QUANTITY}
                            label={copy.quantityName(title)}
                          />
                          <Button
                            type="submit"
                            variant="success"
                            aria-label={copy.addName(title)}
                          >
                            {copy.add}
                          </Button>
                        </div>
                      </form>
                    );
                  })}
                </div>
              )}
              {matches.length > shown.length && (
                <p className="text-sm text-ink-700">
                  {copy.showing(shown.length, matches.length)}
                </p>
              )}
            </>
          )}
        </div>
      </details>
    </div>
  );
}
