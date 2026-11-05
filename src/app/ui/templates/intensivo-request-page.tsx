import { Button, ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { Icon } from "../atoms/icons";
import { ConditionsNote } from "../molecules/conditions-note";
import { ErrorSummary } from "../molecules/error-summary";
import { PriceTag } from "../molecules/price-tag";
import {
  PublicCheckboxField,
  PublicTextField,
} from "../molecules/public-fields";

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
    | "back"
    | "errorsTitle",
    string
  >;
  intensivo: { name: string; dateLine: string; deposit: string };
  conditions: { label: string; policyText: string; minSeats: string };
  backHref: string;
  values: Record<"fullName" | "email" | "phone", string>;
  errors: Partial<Record<Field, string>>;
  formError?: string | undefined;
}

/**
 * Public seat request form of a workshop: plain structural props and a native
 * form post, so it works without JavaScript and keeps the typed values. It
 * shares the enrollment form's card and fields; the conditions sit by the
 * checkbox that accepts them, and a failed submit lands on a linked summary,
 * because the page reloads at the top and a phone would not see the field.
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
  const summary = (
    [
      ["fullName", errors.fullName],
      ["email", errors.email],
      ["phone", errors.phone],
      ["policy", errors.policy],
    ] as const
  ).flatMap(([fieldId, message]) => (message ? [{ fieldId, message }] : []));
  return (
    <main className="mx-auto flex w-full max-w-prose flex-col gap-8 pt-page-top pb-section">
      <ButtonLink href={backHref} variant="tertiary" className="self-start">
        <Icon name="chevron-left" aria-hidden="true" className="size-5" />
        {copy.back}
      </ButtonLink>
      <header className="flex flex-col gap-2">
        <Heading level={1}>{copy.title}</Heading>
        <p className="font-display text-xl italic text-ink-900">
          {`${intensivo.name} · ${intensivo.dateLine}`}
        </p>
        <Text>{copy.intro}</Text>
      </header>
      <PriceTag label={copy.deposit} amount={intensivo.deposit} />
      {formError ? (
        <p role="alert" className="font-semibold text-terracotta-700">
          {formError}
        </p>
      ) : null}
      <ErrorSummary title={copy.errorsTitle} errors={summary} />
      <form
        method="post"
        aria-label={copy.title}
        className="flex flex-col gap-5 rounded-md bg-surface p-5 shadow-raised sm:p-8"
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
        <PublicTextField
          id="fullName"
          label={copy.fullName}
          icon="user"
          name="fullName"
          autoComplete="name"
          required
          defaultValue={values.fullName}
          error={errors.fullName}
        />
        <PublicTextField
          id="email"
          label={copy.email}
          icon="mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={values.email}
          error={errors.email}
        />
        <PublicTextField
          id="phone"
          label={copy.phone}
          icon="phone"
          hint={copy.phoneHint}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          defaultValue={values.phone}
          error={errors.phone}
        />
        <ConditionsNote {...conditions} level={2} />
        <PublicCheckboxField
          id="policy"
          label={copy.policy}
          name="policy"
          required
          error={errors.policy}
        />
        <Button
          type="submit"
          variant="success"
          className="w-full sm:w-auto sm:self-start"
        >
          {copy.submit}
        </Button>
      </form>
    </main>
  );
}
