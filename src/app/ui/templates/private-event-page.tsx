import { Button } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { TextAreaField, TextField } from "../admin/form-fields";

type Field =
  | "fullName"
  | "phone"
  | "email"
  | "desiredDate"
  | "place"
  | "participants"
  | "notes";

export interface PrivateEventPageCopy {
  readonly title: string;
  readonly intro: string;
  readonly form: Record<
    | "label"
    | "submit"
    | "fullName"
    | "phone"
    | "phoneHint"
    | "email"
    | "desiredDate"
    | "place"
    | "placeHint"
    | "participants"
    | "participantsHint"
    | "notes"
    | "notesHint",
    string
  >;
  readonly thanks: Record<
    "title" | "message" | "whatsapp" | "instagram",
    string
  >;
}

export type PrivateEventPageProps = {
  copy: PrivateEventPageCopy;
  whatsappHref: string | undefined;
  instagramHref: string;
} & (
  | { state: "thanks" }
  | {
      state: "form";
      values: Record<Field, string>;
      errors: Partial<Record<Field, string>>;
      /** Earliest selectable date (`YYYY-MM-DD`, Córdoba today). */
      minDate: string;
    }
);

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/** Public private-event request page; plain structural props, native form post. */
export function PrivateEventPage(props: PrivateEventPageProps) {
  const { copy, whatsappHref, instagramHref } = props;

  if (props.state === "thanks") {
    return (
      <main className="flex max-w-prose flex-col gap-4 py-section">
        <Heading level={1}>{copy.thanks.title}</Heading>
        <Text>{copy.thanks.message}</Text>
        <div className="flex flex-wrap gap-4">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClasses}
            >
              {copy.thanks.whatsapp}
            </a>
          ) : null}
          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {copy.thanks.instagram}
          </a>
        </div>
      </main>
    );
  }

  const { values, errors, minDate } = props;
  return (
    <main className="flex max-w-prose flex-col gap-6 py-section">
      <header className="flex flex-col gap-2">
        <Heading level={1}>{copy.title}</Heading>
        <Text>{copy.intro}</Text>
      </header>
      <form
        method="post"
        aria-label={copy.form.label}
        className="flex flex-col gap-4"
      >
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="honeypot">No completes este campo</label>
          <input
            autoComplete="off"
            id="honeypot"
            name="honeypot"
            tabIndex={-1}
            type="text"
          />
        </div>
        <TextField
          label={copy.form.fullName}
          name="fullName"
          autoComplete="name"
          required
          defaultValue={values.fullName}
          error={errors.fullName}
        />
        <TextField
          label={copy.form.phone}
          hint={copy.form.phoneHint}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={values.phone}
          error={errors.phone}
        />
        <TextField
          label={copy.form.email}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          error={errors.email}
        />
        <TextField
          label={copy.form.desiredDate}
          name="desiredDate"
          type="date"
          min={minDate}
          required
          defaultValue={values.desiredDate}
          error={errors.desiredDate}
        />
        <TextField
          label={copy.form.place}
          hint={copy.form.placeHint}
          name="place"
          required
          maxLength={200}
          defaultValue={values.place}
          error={errors.place}
        />
        <TextField
          label={copy.form.participants}
          hint={copy.form.participantsHint}
          name="participants"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          required
          defaultValue={values.participants}
          error={errors.participants}
        />
        <TextAreaField
          label={copy.form.notes}
          hint={copy.form.notesHint}
          name="notes"
          maxLength={1000}
          defaultValue={values.notes}
          error={errors.notes}
        />
        <div>
          <Button type="submit">{copy.form.submit}</Button>
        </div>
      </form>
    </main>
  );
}
