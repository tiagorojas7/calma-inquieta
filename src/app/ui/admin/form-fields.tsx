import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { IconName } from "../atoms/icons";
import { FieldIcon, iconPadding } from "../molecules/field-icon";

interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

const controlClasses =
  "min-h-11 w-full rounded-sm border border-clay-600 bg-surface px-3 py-2 text-base text-ink-900";

function describedByOf(id: string, { hint, error }: Partial<FieldProps>) {
  return (
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined
  );
}

function Messages({ id, hint, error }: Partial<FieldProps> & { id: string }) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-terracotta-700"
        >
          {error}
        </p>
      )}
    </>
  );
}

/** Label, hint and error plumbing shared by every field. */
function Field({
  label,
  hint,
  error,
  children,
}: FieldProps & {
  children: (control: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold text-ink-900">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedByOf(id, { hint, error }),
        "aria-invalid": error ? true : undefined,
      })}
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

/** A field's optional leading icon (see `FieldIcon`). */
interface IconProps {
  icon?: IconName | undefined;
}

const withIcon = (icon: IconName | undefined) =>
  `${controlClasses} ${iconPadding(icon)}`.trim();

export function TextField({
  label,
  hint,
  error,
  icon,
  ...props
}: FieldProps & IconProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <FieldIcon icon={icon}>
          <input
            type="text"
            {...props}
            {...control}
            className={withIcon(icon)}
          />
        </FieldIcon>
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  icon,
  ...props
}: FieldProps & IconProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <FieldIcon icon={icon} multiline>
          <textarea
            rows={4}
            {...props}
            {...control}
            className={withIcon(icon)}
          />
        </FieldIcon>
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  icon,
  options,
  ...props
}: FieldProps &
  IconProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: readonly { value: string; label: string }[];
  }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <FieldIcon icon={icon}>
          <select {...props} {...control} className={withIcon(icon)}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldIcon>
      )}
    </Field>
  );
}

export function CheckboxField({
  label,
  hint,
  error,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          {...props}
          id={id}
          type="checkbox"
          aria-describedby={describedByOf(id, { hint, error })}
          aria-invalid={error ? true : undefined}
          className="size-5"
        />
        <label htmlFor={id} className="text-ink-900">
          {label}
        </label>
      </div>
      <Messages id={id} hint={hint} error={error} />
    </div>
  );
}

/** Form-level error shown when saving fails; the form keeps its values. */
export function FormError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md bg-sand-200 p-3 font-semibold text-terracotta-700"
    >
      {message}
    </p>
  );
}
