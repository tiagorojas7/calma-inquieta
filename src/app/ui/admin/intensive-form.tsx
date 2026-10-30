import { Text } from "../atoms/heading";
import { AdminButton as Button } from "./admin-button";
import { AdminButtonLink } from "./admin-button-link";
import { ImageField, type ImageFieldFailure } from "./image-field";
import {
  CheckboxField,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.intensives;
/** Image slots shown before the owner asks for more. */
const VISIBLE_IMAGES = 2;
const IMAGE_SLOTS = 6;

type Teacher = {
  readonly id: string;
  readonly name: string;
  readonly modality: "own" | "third_party";
};
type Field =
  | "name"
  | "slug"
  | "summary"
  | "description"
  | "teacherId"
  | "percentage"
  | "eventDate"
  | "timeRange"
  | "price"
  | "deposit"
  | "capacity"
  | "minSeats"
  | "policyText"
  | "images";
type Draft = {
  readonly name: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly teacherId: string;
  readonly percentage: string;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: string;
  readonly deposit: string;
  readonly capacity: string;
  readonly minSeats: string;
  readonly policyText: string;
  readonly materialsIncluded: boolean;
  readonly images: readonly {
    readonly assetId: string;
    readonly src?: string;
    readonly alt: string;
  }[];
};

async function upload(file: File) {
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/admin/imagenes", { method: "POST", body });
    if (!response.ok)
      return {
        ok: false as const,
        error:
          response.status === 413
            ? "too-large"
            : response.status === 503
              ? "unavailable"
              : ("failed" as ImageFieldFailure),
      };
    return {
      ok: true as const,
      image: (await response.json()) as { id: string; src: string },
    };
  } catch {
    return { ok: false as const, error: "failed" as ImageFieldFailure };
  }
}

/**
 * The intensivo on one page. A native `<form method="post">` (the Worker gate
 * denies `/admin/**.data`). Main fields first; the seats, policy, percentage
 * and materials live under "Opciones avanzadas", closed unless a third-party
 * teacher or an error needs them. In `new` mode the slug and summary are not
 * asked (they are derived) and the first submit button, Publicar, is the
 * primary one so Enter publishes; in `edit` mode a single save button posts.
 */
export function IntensiveForm({
  values,
  errors,
  formError,
  teachers,
  cancelHref,
  mode = "edit",
  saveVariant = "primary",
}: {
  values: Draft;
  errors: Readonly<Partial<Record<Field, string>>>;
  formError?: string | undefined;
  teachers: readonly Teacher[];
  cancelHref: string;
  mode?: "new" | "edit";
  /** Lets another action on the page be the one primary button. */
  saveVariant?: "primary" | "secondary";
}) {
  const options = [
    { value: "", label: copy.form.teacherPlaceholder },
    ...teachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} (${teacher.modality === "own" ? "Propia" : "De terceros"})`,
    })),
  ];
  const thirdParty = teachers.some(
    (teacher) =>
      teacher.id === values.teacherId && teacher.modality === "third_party",
  );
  const advancedOpen =
    thirdParty ||
    Boolean(
      errors.percentage ||
      errors.minSeats ||
      errors.policyText ||
      errors.slug ||
      errors.summary,
    );
  const imageField = (index: number) => {
    const image = values.images[index];
    return (
      <ImageField
        name="gallery"
        label={copy.form.images}
        upload={upload}
        current={
          image?.src
            ? { assetId: image.assetId, src: image.src, alt: image.alt }
            : undefined
        }
      />
    );
  };
  return (
    <form method="post" noValidate className="flex max-w-prose flex-col gap-5">
      {mode === "edit" && <input type="hidden" name="intent" value="save" />}
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
      <TextField
        label={copy.form.eventDate}
        name="eventDate"
        type="date"
        defaultValue={values.eventDate}
        error={errors.eventDate}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={copy.form.startsAt}
          name="startsAt"
          type="time"
          defaultValue={values.startsAt}
          error={errors.timeRange}
        />
        <TextField
          label={copy.form.endsAt}
          name="endsAt"
          type="time"
          defaultValue={values.endsAt}
          error={errors.timeRange}
        />
      </div>
      <SelectField
        label={copy.form.teacher}
        name="teacherId"
        options={options}
        defaultValue={values.teacherId}
        error={errors.teacherId}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label={copy.form.price}
          name="price"
          inputMode="numeric"
          defaultValue={values.price}
          error={errors.price}
        />
        <TextField
          label={copy.form.deposit}
          name="deposit"
          inputMode="numeric"
          defaultValue={values.deposit}
          error={errors.deposit}
        />
        <TextField
          label={copy.form.capacity}
          name="capacity"
          inputMode="numeric"
          defaultValue={values.capacity}
          error={errors.capacity}
        />
      </div>
      <section
        className="flex flex-col gap-3"
        aria-label={copy.form.sections.images}
      >
        <h2 className="font-display text-xl text-ink-900">
          {copy.form.sections.images}
        </h2>
        {Array.from({ length: VISIBLE_IMAGES }, (_, index) => (
          <div key={index}>{imageField(index)}</div>
        ))}
        <details
          open={
            values.images.length > VISIBLE_IMAGES || errors.images !== undefined
          }
        >
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-clay-800 underline underline-offset-4">
            {copy.form.moreImages}
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {Array.from(
              { length: IMAGE_SLOTS - VISIBLE_IMAGES },
              (_, i) => i + VISIBLE_IMAGES,
            ).map((index) => (
              <div key={index}>{imageField(index)}</div>
            ))}
          </div>
        </details>
        {errors.images && <p role="alert">{errors.images}</p>}
      </section>
      <details open={advancedOpen || undefined}>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink-900">
          {copy.quick.advanced}
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {mode === "new" && (
            <>
              <Text tone="muted">{copy.quick.advancedHint}</Text>
              <Text tone="muted">{copy.quick.derivedNote}</Text>
            </>
          )}
          {mode === "edit" && (
            <>
              <TextField
                label={copy.form.slug}
                name="slug"
                defaultValue={values.slug}
                error={errors.slug}
              />
              <TextField
                label={copy.form.summary}
                name="summary"
                defaultValue={values.summary}
                error={errors.summary}
              />
            </>
          )}
          <TextField
            label={copy.form.percentage}
            hint={copy.quick.percentageHint}
            name="percentage"
            inputMode="decimal"
            defaultValue={values.percentage}
            error={errors.percentage}
          />
          <TextField
            label={copy.form.minSeats}
            hint={copy.quick.minSeatsHint}
            name="minSeats"
            inputMode="numeric"
            defaultValue={values.minSeats}
            error={errors.minSeats}
          />
          <TextAreaField
            label={copy.form.policyText}
            hint={copy.quick.policyHint}
            name="policyText"
            defaultValue={values.policyText}
            error={errors.policyText}
          />
          <CheckboxField
            label={copy.form.materialsIncluded}
            name="materialsIncluded"
            defaultChecked={values.materialsIncluded}
          />
        </div>
      </details>
      <div className="flex flex-wrap gap-3">
        {mode === "new" ? (
          <>
            <Button type="submit" name="intent" value="publish">
              {copy.quick.publish}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="secondary"
            >
              {copy.quick.saveDraft}
            </Button>
          </>
        ) : (
          <Button type="submit" variant={saveVariant}>
            {copy.form.save}
          </Button>
        )}
        <AdminButtonLink href={cancelHref} variant="secondary">
          {copy.form.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
