import { Button } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { CheckboxField, FormError, TextField } from "../admin/form-fields";
import { ConditionsNote } from "../molecules/conditions-note";
import { PriceTag } from "../molecules/price-tag";

type Field = "fullName" | "email" | "phone" | "policy";

export interface IntensivoRequestPageProps {
  copy: Record<
    | "title"
    | "intro"
    | "deposit"
    | "fullName"
    | "email"
    | "phone"
    | "phoneHint"
    | "policy"
    | "submit"
    | "back",
    string
  >;
  intensivo: { name: string; dateLine: string; deposit: string };
  conditions: { label: string; policyText: string; minSeats: string };
  backHref: string;
  values: Record<"fullName" | "email" | "phone", string>;
  errors: Partial<Record<Field, string>>;
  formError?: string | undefined;
}

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * Public seat request form of an intensivo: plain structural props and a
 * native form post, so it works without JavaScript and keeps the typed values.
 */
export function IntensivoRequestPage({
  copy,
  intensivo,
  conditions,
  backHref,
  values,
  errors,
  formError,
}: IntensivoRequestPageProps) {
  return (
    <main className="flex max-w-prose flex-col gap-6 py-section">
      <header className="flex flex-col gap-2">
        <Heading level={1}>{copy.title}</Heading>
        <Text>{`${intensivo.name} · ${intensivo.dateLine}`}</Text>
        <Text>{copy.intro}</Text>
      </header>
      <PriceTag label={copy.deposit} amount={intensivo.deposit} />
      <ConditionsNote {...conditions} level={2} />
      <form
        method="post"
        aria-label={copy.title}
        className="flex flex-col gap-4"
      >
        <FormError message={formError} />
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
          label={copy.fullName}
          name="fullName"
          autoComplete="name"
          required
          defaultValue={values.fullName}
          error={errors.fullName}
        />
        <TextField
          label={copy.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={values.email}
          error={errors.email}
        />
        <TextField
          label={copy.phone}
          hint={copy.phoneHint}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          defaultValue={values.phone}
          error={errors.phone}
        />
        <CheckboxField
          label={copy.policy}
          name="policy"
          required
          error={errors.policy}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="success">
            {copy.submit}
          </Button>
          <a href={backHref} className={linkClasses}>
            {copy.back}
          </a>
        </div>
      </form>
    </main>
  );
}
