import { Button, ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { Icon } from "../atoms/icons";
import { Image } from "../atoms/image";
import { ConditionsNote } from "../molecules/conditions-note";
import { ErrorSummary } from "../molecules/error-summary";
import { PolicyAcceptanceField } from "../molecules/policy-acceptance-field";
import { PublicTextField } from "../molecules/public-fields";

type Field = "fullName" | "email" | "phone" | "policy" | "project";

export interface RequestProjectOption {
  id: string;
  name: string;
  /** Already formatted total price. */
  total: string;
  /** Already formatted deposit. */
  deposit: string;
  /** What the project is about; shown inside its choice when present. */
  description?: string;
  image?: { src: string; alt: string; width: number; height: number };
}

export interface IntensivoRequestPageProps {
  copy: Record<
    | "title"
    | "intro"
    | "project"
    | "projectTotal"
    | "projectDeposit"
    | "fullName"
    | "email"
    | "phone"
    | "phoneHint"
    | "submit"
    | "back"
    | "errorsTitle",
    string
  >;
  intensivo: { name: string; dateLine: string };
  /** In admin order; one is chosen, and a single one comes preselected. */
  projects: readonly RequestProjectOption[];
  conditions: { label: string; policyText: string; minSeats: string };
  /**
   * The versions of the conditions and privacy documents the page shows,
   * posted back with the form; null when they could not be read.
   */
  policies?: { conditionsVersion: number; privacyVersion: number } | null;
  backHref: string;
  values: Record<"fullName" | "email" | "phone" | "projectId", string>;
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
  projects,
  conditions,
  policies = null,
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
      ["project", errors.project],
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
        <fieldset
          aria-describedby={errors.project ? "project-error" : undefined}
          className="flex flex-col gap-3"
        >
          <legend className="mb-2 font-semibold text-ink-900">
            {copy.project}
          </legend>
          {projects.map((project, index) => (
            <label
              key={project.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-clay-600 p-3 has-[:checked]:border-2 has-[:checked]:border-clay-800"
            >
              <input
                type="radio"
                id={index === 0 ? "project" : `project-${String(index)}`}
                name="project"
                value={project.id}
                required
                defaultChecked={
                  projects.length === 1 || values.projectId === project.id
                }
                className="mt-1 size-5 shrink-0 accent-clay-600"
              />
              {project.image ? (
                <Image
                  {...project.image}
                  className="size-16 shrink-0 rounded-sm object-cover"
                  intrinsicRatio={false}
                />
              ) : null}
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-ink-900">
                  {project.name}
                </span>
                {project.description ? (
                  <span className="text-sm text-ink-700">
                    {project.description}
                  </span>
                ) : null}
                <span className="text-sm text-ink-700">
                  {`${copy.projectTotal}: ${project.total}`}
                </span>
                <span className="text-sm text-ink-700">
                  {`${copy.projectDeposit}: ${project.deposit}`}
                </span>
              </span>
            </label>
          ))}
          {errors.project ? (
            <p
              id="project-error"
              className="text-sm font-semibold text-terracotta-700"
            >
              {errors.project}
            </p>
          ) : null}
        </fieldset>
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
        <PolicyAcceptanceField versions={policies} error={errors.policy} />
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
