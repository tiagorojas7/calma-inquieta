import { AdminButton as Button } from "./admin-button";
import {
  CheckboxField,
  FormError,
  TextAreaField,
  TextField,
} from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.workshops.periods.detail;
type Values = {
  readonly fee: string;
  readonly materialsRequired: boolean;
  readonly projectTitle: string;
  readonly projectDescription: string;
  readonly capacities: readonly {
    readonly turnoId: string;
    readonly label: string;
    readonly capacity: string;
  }[];
  readonly snapshotPercentage: string;
  readonly materialIds: readonly string[];
};
type MaterialOption = {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly available: boolean;
  readonly historical: boolean;
};

export function WorkshopPeriodForm({
  values,
  materialOptions,
  errors,
  formError,
}: {
  values: Values;
  materialOptions: readonly MaterialOption[];
  errors: Readonly<Partial<Record<keyof Values, string>>>;
  formError?: string | undefined;
}) {
  return (
    <form method="post" noValidate className="flex max-w-prose flex-col gap-4">
      <input type="hidden" name="intent" value="save" />
      <FormError message={formError} />
      <TextField
        label={copy.fee}
        name="fee"
        inputMode="numeric"
        defaultValue={values.fee}
        error={errors.fee}
      />
      <CheckboxField
        label={copy.materialsRequired}
        name="materialsRequired"
        defaultChecked={values.materialsRequired}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold text-ink-900">{copy.materials}</legend>
        {materialOptions.map((material) => (
          <label key={material.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              name="materialIds"
              value={material.id}
              defaultChecked={values.materialIds.includes(material.id)}
              aria-describedby={
                errors.materialIds ? "period-material-ids-error" : undefined
              }
              aria-invalid={errors.materialIds ? true : undefined}
              className="size-5"
            />
            <span>{copy.materialOption(material)}</span>
          </label>
        ))}
        {errors.materialIds && (
          <p
            id="period-material-ids-error"
            role="alert"
            className="text-sm text-terracotta-700"
          >
            {errors.materialIds}
          </p>
        )}
      </fieldset>
      <TextField
        label={copy.projectTitle}
        name="projectTitle"
        defaultValue={values.projectTitle}
        error={errors.projectTitle}
      />
      <TextAreaField
        label={copy.projectDescription}
        name="projectDescription"
        defaultValue={values.projectDescription}
        error={errors.projectDescription}
      />
      <fieldset className="flex flex-col gap-4">
        <legend className="font-semibold text-ink-900">
          {copy.capacities}
        </legend>
        {values.capacities.map((turno) => (
          <TextField
            key={turno.turnoId}
            label={turno.label}
            name={`capacity-${turno.turnoId}`}
            inputMode="numeric"
            defaultValue={turno.capacity}
            error={errors.capacities}
          />
        ))}
      </fieldset>
      <TextField
        label={copy.snapshotPercentage}
        name="snapshotPercentage"
        inputMode="decimal"
        defaultValue={values.snapshotPercentage}
        error={errors.snapshotPercentage}
      />
      <Button type="submit">{copy.save}</Button>
    </form>
  );
}
