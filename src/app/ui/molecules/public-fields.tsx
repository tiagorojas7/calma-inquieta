import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import type { IconName } from "../atoms/icons";
import { FieldIcon, iconPadding } from "./field-icon";

interface FieldProps {
  /** Stable id: the error summary links to it and tests can address it. */
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

/** A field's optional leading icon (see `FieldIcon`). */
interface IconProps {
  icon?: IconName | undefined;
}

const controlBase =
  "min-h-11 w-full rounded-sm bg-surface px-3 py-2 text-base text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function controlClasses(error: string | undefined) {
  return `${controlBase} ${error ? "border-2 border-terracotta-700" : "border border-clay-600"}`;
}

function describedBy({ id, hint, error }: FieldProps) {
  return (
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined
  );
}

/** Hint and error text. Errors are not live regions: the summary announces. */
function Messages({ id, hint, error }: FieldProps) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="text-sm font-semibold text-terracotta-700"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}

function Field({ children, ...field }: FieldProps & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={field.id} className="font-semibold text-ink-900">
        {field.label}
      </label>
      {children}
      <Messages {...field} />
    </div>
  );
}

export function PublicTextField({
  label,
  hint,
  error,
  icon,
  ...props
}: FieldProps & IconProps & InputHTMLAttributes<HTMLInputElement>) {
  const field = { id: props.id, label, hint, error };
  return (
    <Field {...field}>
      <FieldIcon icon={icon}>
        <input
          type="text"
          {...props}
          aria-describedby={describedBy(field)}
          aria-invalid={error ? true : undefined}
          className={`${controlClasses(error)} ${iconPadding(icon)}`.trim()}
        />
      </FieldIcon>
    </Field>
  );
}

export function PublicSelectField({
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
  const field = { id: props.id, label, hint, error };
  return (
    <Field {...field}>
      <FieldIcon icon={icon}>
        <select
          {...props}
          aria-describedby={describedBy(field)}
          aria-invalid={error ? true : undefined}
          className={`${controlClasses(error)} ${iconPadding(icon)}`.trim()}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldIcon>
    </Field>
  );
}

/** The whole row is the 44 px target; the box itself is 24 px. */
export function PublicCheckboxField({
  label,
  hint,
  error,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const field = { id: props.id, label, hint, error };
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={field.id}
        className="flex min-h-11 items-center gap-3 text-ink-900"
      >
        <input
          {...props}
          type="checkbox"
          aria-describedby={describedBy(field)}
          aria-invalid={error ? true : undefined}
          className="size-6 shrink-0 accent-clay-600"
        />
        {label}
      </label>
      <Messages {...field} />
    </div>
  );
}
