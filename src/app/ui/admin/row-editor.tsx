import type { ReactNode } from "react";
import { AdminButton as Button } from "./admin-button";
import { adminMicrocopy } from "./microcopy";

const { rowEditor: copy } = adminMicrocopy;

/**
 * Controlled editor for an ordered list of rows (variants, turnos, gallery
 * entries). It owns the add, remove and reorder controls and leaves the row
 * fields to the caller; the first row cannot move up, the last cannot move
 * down, and `max` stops further additions.
 */
export function RowEditor<Row>({
  legend,
  addLabel,
  rows,
  rowKey,
  renderRow,
  onAdd,
  onRemove,
  onMove,
  max,
}: {
  legend: string;
  addLabel: string;
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  renderRow: (row: Row, index: number) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  max?: number;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-semibold text-ink-900">{legend}</legend>
      <ol className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={rowKey(row)}
            className="flex flex-wrap items-center gap-3 rounded-md bg-surface p-3 shadow-card"
          >
            <div className="min-w-0 flex-1">{renderRow(row, index)}</div>
            <Button
              type="button"
              variant="outline"
              aria-label={copy.rowName(copy.moveUp, index + 1)}
              disabled={index === 0}
              onClick={() => {
                onMove(index, -1);
              }}
            >
              {copy.moveUp}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label={copy.rowName(copy.moveDown, index + 1)}
              disabled={index === rows.length - 1}
              onClick={() => {
                onMove(index, 1);
              }}
            >
              {copy.moveDown}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label={copy.rowName(copy.remove, index + 1)}
              onClick={() => {
                onRemove(index);
              }}
            >
              {copy.remove}
            </Button>
          </li>
        ))}
      </ol>
      <div>
        <Button
          type="button"
          disabled={max !== undefined && rows.length >= max}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>
    </fieldset>
  );
}
