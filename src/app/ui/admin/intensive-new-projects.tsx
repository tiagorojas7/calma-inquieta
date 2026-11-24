import { useRef, useState } from "react";
import { Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminFieldPair } from "./admin-sections";
import { TextAreaField, TextField } from "./form-fields";
import { ImageField, type ImageFieldUpload } from "./image-field";
import {
  fold,
  type ProjectMaterialChoice,
} from "./intensive-project-materials";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensives.form.newProjects;
const bill = copy.materials;

/** What one project block shows: the text typed, the chosen image and the bill. */
export interface NewProjectBlockValues {
  readonly name: string;
  readonly price: string;
  readonly deposit: string;
  readonly description: string;
  readonly image: {
    readonly assetId: string;
    readonly src?: string;
    readonly alt: string;
  } | null;
  /** Catalog variants per participant; the quantity stays as typed. */
  readonly materials: readonly {
    readonly variantId: string;
    readonly quantity: string;
  }[];
}

/** A message per field name, as the refused form returns them. */
type Errors = Readonly<Partial<Record<string, string>>>;

const BLANK: NewProjectBlockValues = {
  name: "",
  price: "",
  deposit: "",
  description: "",
  image: null,
  materials: [],
};

/** The form stays usable on a phone: more blocks than this is never useful. */
const MAX_BLOCKS = 20;
/** Mirrors the domain rule: 1 to 20 whole units per participant. */
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 20;
/** Results shown at once, so a large catalog never floods a phone. */
const MAX_RESULTS = 8;

const CARD =
  "flex flex-col gap-4 rounded-md border border-admin-line p-4 sm:p-5";
const SUMMARY =
  "inline-flex min-h-11 cursor-pointer items-center font-semibold text-clay-800 underline underline-offset-4";
const QUANTITY_INPUT =
  "min-h-11 w-24 rounded-sm border border-clay-600 bg-surface px-3 py-2 text-base text-ink-900";

/** "En stock: N" while the studio keeps it and holds units, otherwise "Se pide". */
const availability = (choice: ProjectMaterialChoice): string =>
  choice.keptInStudio === true && choice.onHand !== null && choice.onHand > 0
    ? bill.inStock(choice.onHand)
    : bill.toOrder;

interface Line {
  readonly variantId: string;
  readonly quantity: string;
}

/**
 * The bill of one block. Lines live in the browser until the form is posted:
 * each is a hidden variant and a number input named by block and line, so the
 * one native submit carries them. The search box has no name and Enter in it
 * never submits the form.
 */
function BlockMaterials({
  block,
  initial,
  choices,
  errors,
}: {
  block: number;
  initial: readonly Line[];
  choices: readonly ProjectMaterialChoice[];
  errors: Errors;
}) {
  const [lines, setLines] = useState<readonly Line[]>(initial);
  const [query, setQuery] = useState("");
  const number = block + 1;
  const prefix = `project${String(block)}Material`;
  const chosen = new Set(lines.map((line) => line.variantId));
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  const matches =
    tokens.length === 0
      ? []
      : choices.filter((choice) => {
          if (chosen.has(choice.variantId)) return false;
          const haystack = fold(`${choice.name} ${choice.label}`);
          return tokens.every((token) => haystack.includes(token));
        });
  const shown = matches.slice(0, MAX_RESULTS);
  const addable = choices.some((choice) => !chosen.has(choice.variantId));

  return (
    <div className="flex flex-col gap-3 border-t border-admin-line pt-3">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink-900">{bill.title}</p>
        <p className="text-sm text-ink-700">{bill.hint}</p>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-ink-700">{bill.empty}</p>
      ) : (
        <div
          role="group"
          aria-label={bill.listLabel(number)}
          className="flex flex-col gap-2"
        >
          {lines.map((line, index) => {
            const choice = choices.find((c) => c.variantId === line.variantId);
            const title = choice
              ? `${choice.name} ${choice.label}`.trim()
              : bill.missing;
            const variantError = errors[`${prefix}Variant${String(index)}`];
            const quantityError = errors[`${prefix}Quantity${String(index)}`];
            return (
              <div
                key={line.variantId}
                className="flex flex-col gap-2 rounded-md bg-sand-100 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-semibold text-ink-900">
                      {choice?.name ?? bill.missing}
                    </span>
                    {choice && (
                      <span className="text-sm text-ink-700">
                        {[choice.label, availability(choice)].join(" · ")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="hidden"
                      name={`${prefix}Variant${String(index)}`}
                      value={line.variantId}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      name={`${prefix}Quantity${String(index)}`}
                      aria-label={bill.quantityName(title)}
                      aria-invalid={quantityError ? true : undefined}
                      min={MIN_QUANTITY}
                      max={MAX_QUANTITY}
                      step={1}
                      defaultValue={line.quantity}
                      className={QUANTITY_INPUT}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={bill.removeName(title)}
                      onClick={() => {
                        setLines(
                          lines.filter((l) => l.variantId !== line.variantId),
                        );
                      }}
                    >
                      {bill.remove}
                    </Button>
                  </div>
                </div>
                {variantError && (
                  <p role="alert" className="text-sm text-terracotta-700">
                    {variantError}
                  </p>
                )}
                {quantityError && (
                  <p role="alert" className="text-sm text-terracotta-700">
                    {quantityError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <details>
        <summary className={SUMMARY}>{bill.addSummary}</summary>
        <div className="mt-3 flex flex-col gap-3">
          {!addable ? (
            <p className="text-sm text-ink-700">{bill.noCatalog}</p>
          ) : (
            <>
              <TextField
                label={bill.search}
                hint={bill.searchHint}
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
              />
              {tokens.length === 0 ? (
                <p className="text-sm text-ink-700">{bill.typeToSearch}</p>
              ) : shown.length === 0 ? (
                <p role="status" className="text-sm text-ink-700">
                  {bill.noMatches}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {shown.map((choice) => (
                    <div
                      key={choice.variantId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-admin-line p-3"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="font-semibold text-ink-900">
                          {choice.name}
                        </span>
                        <span className="text-sm text-ink-700">
                          {[choice.label, availability(choice)].join(" · ")}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="success"
                        aria-label={bill.addName(
                          `${choice.name} ${choice.label}`,
                        )}
                        onClick={() => {
                          setLines([
                            ...lines,
                            { variantId: choice.variantId, quantity: "1" },
                          ]);
                        }}
                      >
                        {bill.add}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {matches.length > shown.length && (
                <p className="text-sm text-ink-700">
                  {bill.showing(shown.length, matches.length)}
                </p>
              )}
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function ProjectBlock({
  index,
  values,
  errors,
  choices,
  upload,
  onRemove,
}: {
  index: number;
  values: NewProjectBlockValues;
  errors: Errors;
  choices: readonly ProjectMaterialChoice[];
  upload: ImageFieldUpload;
  /** Absent for the last remaining block, which cannot be removed. */
  onRemove?: (() => void) | undefined;
}) {
  const number = index + 1;
  const name = (field: string) => `project${String(index)}${field}`;
  const image = values.image;
  return (
    <div role="group" aria-label={copy.block(number)} className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg text-ink-900">
          {copy.block(number)}
        </h3>
        {onRemove && (
          <Button
            type="button"
            variant="secondary"
            aria-label={copy.removeName(number)}
            onClick={onRemove}
          >
            {copy.remove}
          </Button>
        )}
      </div>
      <TextField
        label={copy.name}
        name={name("Name")}
        defaultValue={values.name}
        error={errors[name("Name")]}
        autoComplete="off"
      />
      <AdminFieldPair>
        <TextField
          label={copy.price}
          name={name("Price")}
          inputMode="numeric"
          defaultValue={values.price}
          error={errors[name("Price")]}
        />
        <TextField
          label={copy.deposit}
          name={name("Deposit")}
          inputMode="numeric"
          defaultValue={values.deposit}
          error={errors[name("Deposit")]}
        />
      </AdminFieldPair>
      <TextAreaField
        label={copy.description}
        name={name("Description")}
        rows={3}
        defaultValue={values.description}
        error={errors[name("Description")]}
      />
      <ImageField
        name={name("Image")}
        label={copy.image}
        upload={upload}
        current={
          image?.src
            ? { assetId: image.assetId, src: image.src, alt: image.alt }
            : undefined
        }
      />
      {errors[name("Image")] && (
        <p role="alert" className="text-sm text-terracotta-700">
          {errors[name("Image")]}
        </p>
      )}
      <BlockMaterials
        block={index}
        initial={values.materials}
        choices={choices}
        errors={errors}
      />
    </div>
  );
}

/**
 * The projects of a new workshop, all in the one native form: one block each,
 * added with "Agregar otro proyecto" and removable except the last. Every
 * field is named by its block's position, so the single post carries all of
 * them and a refusal can show each message beside its own field. Blocks keep
 * a stable key, so removing one renumbers the names without losing what was
 * typed in the others; messages are dropped then, because their numbers no
 * longer match.
 */
export function NewProjectBlocks({
  initial,
  errors,
  choices,
  upload,
}: {
  initial: readonly NewProjectBlockValues[];
  errors: Errors;
  choices: readonly ProjectMaterialChoice[];
  upload: ImageFieldUpload;
}) {
  const start = initial.length > 0 ? initial : [BLANK];
  const nextKey = useRef(start.length);
  const [blocks, setBlocks] = useState(() =>
    start.map((values, key) => ({ key, values })),
  );
  const [renumbered, setRenumbered] = useState(false);

  return (
    <section
      className="flex flex-col gap-4"
      aria-label={adminMicrocopy.intensives.form.sections.projects}
    >
      <h2 className="font-display text-xl text-ink-900">
        {adminMicrocopy.intensives.form.sections.projects}
      </h2>
      <Text tone="muted">{copy.hint}</Text>
      {blocks.map((block, index) => (
        <ProjectBlock
          key={block.key}
          index={index}
          values={block.values}
          errors={renumbered ? {} : errors}
          choices={choices}
          upload={upload}
          onRemove={
            blocks.length > 1
              ? () => {
                  setBlocks(blocks.filter((b) => b.key !== block.key));
                  setRenumbered(true);
                }
              : undefined
          }
        />
      ))}
      {blocks.length < MAX_BLOCKS && (
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const key = nextKey.current;
              nextKey.current += 1;
              setBlocks([...blocks, { key, values: BLANK }]);
            }}
          >
            {copy.add}
          </Button>
        </div>
      )}
    </section>
  );
}
