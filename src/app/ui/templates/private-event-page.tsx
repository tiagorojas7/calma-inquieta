import { Button, ButtonLink } from "../atoms/button";
import { EmphasizedLastWord } from "../atoms/emphasis";
import { Icon } from "../atoms/icons";
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

const cardClasses =
  "flex flex-col gap-4 rounded-md bg-surface p-5 shadow-raised sm:p-8";

/** Public private-event request page; plain structural props, native form post. */
export function PrivateEventPage(props: PrivateEventPageProps) {
  const { copy, whatsappHref, instagramHref } = props;

  if (props.state === "thanks") {
    return (
      <main className="max-w-prose pt-page-top pb-section">
        <div data-form-card className={cardClasses}>
          <Heading level={1}>{copy.thanks.title}</Heading>
          <Text>{copy.thanks.message}</Text>
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
            {whatsappHref ? (
              <ButtonLink href={whatsappHref} className="gap-2">
                <Icon name="whatsapp" aria-hidden="true" className="size-5" />
                {copy.thanks.whatsapp}
              </ButtonLink>
            ) : null}
            <ButtonLink href={instagramHref} variant="tertiary">
              <Icon name="instagram" aria-hidden="true" className="size-5" />
              {copy.thanks.instagram}
            </ButtonLink>
          </div>
        </div>
      </main>
    );
  }

  const { values, errors, minDate } = props;
  return (
    <main className="flex max-w-prose flex-col gap-10 pt-page-top pb-section">
      <header className="flex flex-col gap-4">
        <Heading level={1}>
          <EmphasizedLastWord text={copy.title} />
        </Heading>
        <Text className="text-lead">{copy.intro}</Text>
      </header>
      <div data-form-card className={cardClasses}>
        <form
          method="post"
          aria-label={copy.form.label}
          className="flex flex-col gap-8"
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
          {/* Fields are grouped by meaning: who writes, then the event. */}
          <div data-field-group className="flex flex-col gap-4">
            <TextField
              label={copy.form.fullName}
              icon="user"
              name="fullName"
              autoComplete="name"
              required
              defaultValue={values.fullName}
              error={errors.fullName}
            />
            <div data-field-pair className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={copy.form.phone}
                icon="phone"
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
                icon="mail"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={values.email}
                error={errors.email}
              />
            </div>
          </div>
          <div
            data-field-group
            className="flex flex-col gap-4 border-t border-tan-400 pt-8"
          >
            <div data-field-pair className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={copy.form.desiredDate}
                icon="calendar"
                name="desiredDate"
                type="date"
                min={minDate}
                required
                defaultValue={values.desiredDate}
                error={errors.desiredDate}
              />
              <TextField
                label={copy.form.participants}
                icon="group"
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
            </div>
            <TextField
              label={copy.form.place}
              icon="pin"
              hint={copy.form.placeHint}
              name="place"
              required
              maxLength={200}
              defaultValue={values.place}
              error={errors.place}
            />
            <TextAreaField
              label={copy.form.notes}
              icon="note"
              hint={copy.form.notesHint}
              name="notes"
              maxLength={1000}
              defaultValue={values.notes}
              error={errors.notes}
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto sm:self-start">
            {copy.form.submit}
          </Button>
        </form>
      </div>
    </main>
  );
}
