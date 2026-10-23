import { Button } from "../atoms/button";
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

export function IntensiveForm({
  values,
  errors,
  formError,
  teachers,
  cancelHref,
}: {
  values: Draft;
  errors: Readonly<Partial<Record<Field, string>>>;
  formError?: string | undefined;
  teachers: readonly Teacher[];
  cancelHref: string;
}) {
  const options = [
    { value: "", label: copy.form.teacherPlaceholder },
    ...teachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} (${teacher.modality === "own" ? "Propia" : "De terceros"})`,
    })),
  ];
  return (
    <form method="post" noValidate className="flex max-w-prose flex-col gap-4">
      <FormError message={formError} />
      <TextField
        label={copy.form.name}
        name="name"
        defaultValue={values.name}
        error={errors.name}
      />
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
      <TextAreaField
        label={copy.form.description}
        name="description"
        defaultValue={values.description}
        error={errors.description}
      />
      <SelectField
        label={copy.form.teacher}
        name="teacherId"
        options={options}
        defaultValue={values.teacherId}
        error={errors.teacherId}
      />
      <TextField
        label={copy.form.percentage}
        name="percentage"
        inputMode="decimal"
        defaultValue={values.percentage}
        error={errors.percentage}
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
      <TextField
        label={copy.form.minSeats}
        name="minSeats"
        inputMode="numeric"
        defaultValue={values.minSeats}
        error={errors.minSeats}
      />
      <TextAreaField
        label={copy.form.policyText}
        name="policyText"
        defaultValue={values.policyText}
        error={errors.policyText}
      />
      <CheckboxField
        label={copy.form.materialsIncluded}
        name="materialsIncluded"
        defaultChecked={values.materialsIncluded}
      />
      {Array.from({ length: 6 }, (_, index) => (
        <ImageField
          key={index}
          name="gallery"
          label={copy.form.images}
          upload={upload}
          current={
            values.images[index]?.src
              ? {
                  assetId: values.images[index].assetId,
                  src: values.images[index].src,
                  alt: values.images[index].alt,
                }
              : undefined
          }
        />
      ))}
      {errors.images && <p role="alert">{errors.images}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{copy.form.save}</Button>
        <AdminButtonLink href={cancelHref} variant="outline">
          {copy.form.cancel}
        </AdminButtonLink>
      </div>
    </form>
  );
}
