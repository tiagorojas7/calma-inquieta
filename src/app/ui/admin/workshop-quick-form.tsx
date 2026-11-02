import { Text } from "../atoms/heading";
import { AdminButton } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { WORKSHOP_PHOTO_SLOTS } from "./workshop-form";
import {
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";
import { PeriodMaterialsPicker } from "./workshop-period-materials";
import { GalleryFields, type GalleryFieldImage } from "./gallery-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.workshops;
const quick = copy.quick;

export type QuickWorkshopFormField =
  "name" | "description" | "defaultFee" | "teacherId" | "percentage" | "images";

export interface QuickTurnoValues {
  readonly weekday: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly capacity: string;
}

export interface QuickFormValues {
  readonly name: string;
  readonly description: string;
  readonly teacherId: string;
  readonly defaultFee: string;
  readonly percentage: string;
  readonly images: readonly GalleryFieldImage[];
  readonly rows: readonly QuickTurnoValues[];
  readonly materialIds: readonly string[];
}

export interface QuickFormTeacher {
  readonly id: string;
  readonly name: string;
  readonly modality: "own" | "third_party";
}

export interface QuickFormMaterial {
  readonly id: string;
  readonly name: string;
  readonly category: string;
}

const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/** Rows shown up front; the rest open under "+ otro turno". */
const VISIBLE_ROWS = 3;

function TurnoRow({
  index,
  row,
  error,
}: {
  index: number;
  row: QuickTurnoValues;
  error: string | undefined;
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-admin-line p-3">
      <legend className="px-1 font-semibold text-ink-900">
        {quick.row(index + 1)}
      </legend>
      {error ? (
        <p role="alert" className="text-sm text-terracotta-700">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SelectField
          label={quick.weekday}
          name="turnoWeekday"
          defaultValue={row.weekday}
          options={[
            { value: "", label: quick.weekdayPlaceholder },
            ...WEEKDAYS.map((label, position) => ({
              value: String(position + 1),
              label,
            })),
          ]}
        />
        <TextField
          label={quick.startsAt}
          name="turnoStartsAt"
          type="time"
          defaultValue={row.startsAt}
        />
        <TextField
          label={quick.endsAt}
          name="turnoEndsAt"
          type="time"
          defaultValue={row.endsAt}
        />
        <TextField
          label={quick.capacity}
          name="turnoCapacity"
          inputMode="numeric"
          defaultValue={row.capacity}
        />
      </div>
    </fieldset>
  );
}

/**
 * The whole taller on one page: nothing else is needed to publish. A native
 * `<form method="post">`, never a router `Form` or fetcher, because the Worker
 * gate denies `/admin/**.data`. The slug, the summary and the technique are
 * not asked: they are derived. The percentage opens by itself for a
 * third-party teacher and the server validates it either way. The first
 * submit button is the primary one, so Enter publishes.
 */
export function QuickWorkshopForm({
  values,
  errors,
  turnoErrors,
  turnosError,
  formError,
  teachers,
  materials,
  cancelHref,
}: {
  values: QuickFormValues;
  errors: Readonly<Partial<Record<QuickWorkshopFormField, string>>>;
  turnoErrors: Readonly<Record<number, string>>;
  turnosError?: string | undefined;
  formError?: string | undefined;
  teachers: readonly QuickFormTeacher[];
  materials: readonly QuickFormMaterial[];
  cancelHref: string;
}) {
  const teacherOptions = [
    { value: "", label: copy.form.teacherPlaceholder },
    ...teachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} (${adminMicrocopy.teachers.modality[teacher.modality]})`,
    })),
  ];
  const thirdParty = teachers.some(
    (teacher) =>
      teacher.id === values.teacherId && teacher.modality === "third_party",
  );
  const extra = values.rows.slice(VISIBLE_ROWS);
  const extraUsed = extra.some(
    (row, offset) =>
      Boolean(row.weekday || row.startsAt || row.endsAt || row.capacity) ||
      turnoErrors[VISIBLE_ROWS + offset] !== undefined,
  );
  return (
    <form method="post" noValidate className="flex max-w-prose flex-col gap-5">
      <FormError message={formError} />
      <TextField
        label={copy.form.name}
        name="name"
        defaultValue={values.name}
        error={errors.name}
        autoComplete="off"
      />
      <TextAreaField
        label={copy.form.description}
        name="description"
        rows={5}
        defaultValue={values.description}
        error={errors.description}
      />
      <SelectField
        label={copy.form.teacher}
        name="teacherId"
        options={teacherOptions}
        defaultValue={values.teacherId}
        error={errors.teacherId}
      />
      <details open={thirdParty || Boolean(errors.percentage) || undefined}>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink-900">
          {quick.percentageSummary}
        </summary>
        <TextField
          label={copy.form.percentage}
          hint={copy.form.percentageHint}
          name="percentage"
          inputMode="decimal"
          defaultValue={values.percentage}
          error={errors.percentage}
        />
      </details>
      <TextField
        label={copy.form.defaultFee}
        hint={copy.form.defaultFeeHint}
        name="defaultFee"
        inputMode="numeric"
        defaultValue={values.defaultFee}
        error={errors.defaultFee}
      />
      <GalleryFields
        images={values.images}
        slots={WORKSHOP_PHOTO_SLOTS}
        title={copy.form.photosTitle}
        hint={copy.form.photosHint}
        label={copy.form.photo}
        moreLabel={copy.form.morePhotos}
        error={errors.images}
      />
      <section className="flex flex-col gap-3" aria-label={quick.sectionTurnos}>
        <h2 className="font-display text-xl text-ink-900">
          {quick.sectionTurnos}
        </h2>
        <Text tone="muted">{quick.turnosHint}</Text>
        {turnosError ? (
          <p role="alert" className="text-sm text-terracotta-700">
            {turnosError}
          </p>
        ) : null}
        {values.rows.slice(0, VISIBLE_ROWS).map((row, index) => (
          <TurnoRow
            key={`row-${String(index)}`}
            index={index}
            row={row}
            error={turnoErrors[index]}
          />
        ))}
        {extra.length > 0 ? (
          <details open={extraUsed || undefined}>
            <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-clay-800 underline underline-offset-4">
              {quick.moreTurnos}
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {extra.map((row, offset) => (
                <TurnoRow
                  key={`row-${String(VISIBLE_ROWS + offset)}`}
                  index={VISIBLE_ROWS + offset}
                  row={row}
                  error={turnoErrors[VISIBLE_ROWS + offset]}
                />
              ))}
            </div>
          </details>
        ) : null}
      </section>
      {materials.length === 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-ink-900">
            {quick.sectionMaterials}
          </h2>
          <Text tone="muted">{quick.noMaterials}</Text>
        </section>
      ) : (
        <div className="flex flex-col gap-2">
          <Text tone="muted">{quick.materialsHint}</Text>
          <PeriodMaterialsPicker
            legend={quick.sectionMaterials}
            selectedIds={values.materialIds}
            options={materials.map((material) => ({
              ...material,
              active: true,
              available: true,
              historical: false,
            }))}
          />
        </div>
      )}
      <Text tone="muted">{quick.derivedNote}</Text>
      <div className="flex flex-wrap gap-3">
        <AdminButton type="submit" name="intent" value="publish">
          {quick.publish}
        </AdminButton>
        <AdminButton
          type="submit"
          name="intent"
          value="draft"
          variant="secondary"
        >
          {quick.saveDraft}
        </AdminButton>
        <AdminButtonLink href={cancelHref} variant="secondary">
          {copy.form.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
