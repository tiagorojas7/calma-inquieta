import { useId, useState } from "react";
import { AdminButton as Button } from "./admin-button";
import { materialCatalogCopy } from "./material-catalog-copy";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.workshops.periods.detail;
const pickerCopy = materialCatalogCopy.period;

export interface PeriodMaterialOption {
  readonly id: string;
  readonly name: string;
  /** Empty for historical materials whose category is not known here. */
  readonly category: string;
  readonly active: boolean;
  readonly available: boolean;
  readonly historical: boolean;
}

const OTHER_CATEGORY = "Otros materiales";

const fold = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function groupByCategory(options: readonly PeriodMaterialOption[]) {
  const groups = new Map<string, PeriodMaterialOption[]>();
  for (const option of options) {
    const category = option.category || OTHER_CATEGORY;
    groups.set(category, [...(groups.get(category) ?? []), option]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => {
      if (left === OTHER_CATEGORY) return 1;
      if (right === OTHER_CATEGORY) return -1;
      return left.localeCompare(right, "es");
    })
    .map(([category, items]) => ({ category, items }));
}

/**
 * The month's materials grouped by category. Every checkbox stays in the
 * form (filtered rows are only hidden), so a search never changes what is
 * saved. Search and "Elegir todos" need scripts; without them the full list
 * of plain checkboxes still works.
 */
export function PeriodMaterialsPicker({
  options,
  selectedIds,
  error,
}: {
  options: readonly PeriodMaterialOption[];
  selectedIds: readonly string[];
  error?: string | undefined;
}) {
  const searchId = useId();
  const errorId = `${searchId}-error`;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(selectedIds),
  );
  const needle = fold(query);
  const visible = (option: PeriodMaterialOption) =>
    needle === "" ||
    fold(option.name).includes(needle) ||
    fold(option.category).includes(needle);
  const groups = groupByCategory(options);
  const anyVisible = options.some(visible);

  function toggle(ids: readonly string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-semibold text-ink-900">{copy.materials}</legend>
      <div className="flex flex-col gap-1">
        <label htmlFor={searchId} className="font-semibold text-ink-900">
          {pickerCopy.search}
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className="min-h-11 w-full rounded-sm border border-clay-600 bg-surface px-3 py-2 text-base text-ink-900"
        />
      </div>
      {!anyVisible && <p role="status">{pickerCopy.noMatches}</p>}
      {groups.map(({ category, items }) => {
        const shown = items.filter(visible);
        const shownIds = shown.map((item) => item.id);
        const allSelected =
          shownIds.length > 0 && shownIds.every((id) => selected.has(id));
        return (
          <div
            key={category}
            role="group"
            aria-label={pickerCopy.categoryGroup(category)}
            hidden={shown.length === 0}
            className="flex flex-col gap-2 rounded-md border border-sand-300 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-ink-900">{category}</strong>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  toggle(shownIds, !allSelected);
                }}
              >
                {allSelected
                  ? pickerCopy.selectNone(category)
                  : pickerCopy.selectAll(category)}
              </Button>
            </div>
            {items.map((material) => (
              <label
                key={material.id}
                hidden={!visible(material)}
                className="flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  name="materialIds"
                  value={material.id}
                  checked={selected.has(material.id)}
                  onChange={(event) => {
                    toggle([material.id], event.target.checked);
                  }}
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={error ? true : undefined}
                  className="size-5"
                />
                <span>{copy.materialOption(material)}</span>
              </label>
            ))}
          </div>
        );
      })}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-terracotta-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
