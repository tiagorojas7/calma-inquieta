import { Button } from "../atoms/button";
import {
  CheckboxField,
  FormError,
  TextAreaField,
  TextField,
} from "./form-fields";
import { adminMicrocopy } from "./microcopy";

const copy = adminMicrocopy.workshops.periods.detail;
type Field =
  | "fee"
  | "projectTitle"
  | "projectDescription"
  | "capacities"
  | "snapshotPercentage";
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
};

export function WorkshopPeriodForm({
  values,
  errors,
  formError,
}: {
  values: Values;
  errors: Readonly<Partial<Record<Field, string>>>;
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
