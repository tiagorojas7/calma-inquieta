import { Button, ButtonLink } from "../atoms/button";
import { Icon } from "../atoms/icons";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";
import { ErrorSummary } from "../molecules/error-summary";
import {
  PublicCheckboxField,
  PublicSelectField,
  PublicTextField,
} from "../molecules/public-fields";
import { StepIndicator } from "../molecules/step-indicator";

export type EnrollmentPageProps =
  | { state: "paused" }
  | {
      state: "open";
      offer: {
        workshopName: string;
        period: string;
        fee: string;
        materialsRequired: boolean;
        turnos: readonly { id: string; label: string }[];
      };
      values: {
        fullName: string;
        email: string;
        phone: string;
        turnoId: string;
      };
      errors: Partial<
        Record<"fullName" | "email" | "phone" | "policy", string>
      >;
      formError?: string;
      /** Where the back link leads (the workshop being enrolled in). */
      backHref?: string;
      needsMaterials?: true;
      onContinueToMaterials?: () => void;
    };

/** Public enrollment form with plain structural props and no application dependencies. */
export function EnrollmentPage(props: EnrollmentPageProps) {
  if (props.state === "paused") {
    return (
      <main className="flex flex-col gap-4 py-section">
        <Heading level={1}>Inscripciones pausadas</Heading>
        <Text>Por ahora no estamos tomando nuevas inscripciones.</Text>
      </main>
    );
  }

  const {
    offer,
    values,
    errors,
    formError,
    backHref,
    needsMaterials,
    onContinueToMaterials,
  } = props;
  const steps = offer.materialsRequired
    ? ["Tus datos", "Materiales", "Pedido"]
    : ["Tus datos", "Pedido"];
  const summary = (
    [
      ["fullName", errors.fullName],
      ["email", errors.email],
      ["phone", errors.phone],
      ["policy", errors.policy],
    ] as const
  ).flatMap(([fieldId, message]) => (message ? [{ fieldId, message }] : []));
  return (
    <main className="flex max-w-prose flex-col gap-6 py-section">
      {backHref ? (
        <ButtonLink href={backHref} variant="tertiary" className="self-start">
          <Icon name="chevron-left" aria-hidden="true" className="size-5" />
          Volver al taller
        </ButtonLink>
      ) : null}
      <StepIndicator steps={steps} current={1} />
      <header className="flex flex-col gap-2">
        <Heading level={1}>{offer.workshopName}</Heading>
        <Text>{offer.period}</Text>
        <Text className="font-semibold text-ink-900">{offer.fee}</Text>
        {offer.materialsRequired ? (
          <Text tone="accent">Materiales requeridos</Text>
        ) : null}
      </header>
      {needsMaterials ? (
        <section className="flex flex-col gap-3">
          <Text tone="accent">Elegí los materiales para continuar.</Text>
          <Button onClick={onContinueToMaterials} type="button">
            Elegir materiales
          </Button>
        </section>
      ) : (
        <>
          {formError ? (
            <p role="alert" className="font-semibold text-terracotta-700">
              {formError}
            </p>
          ) : null}
          <ErrorSummary title="Revisá estos datos" errors={summary} />
          <form
            className="card-accent flex flex-col gap-5 rounded-md bg-surface p-5 pt-8 shadow-raised sm:p-8 sm:pt-10"
            method="post"
          >
            <input name="period" type="hidden" value={offer.period} />
            <label className="sr-only" htmlFor="honeypot">
              No completes este campo
            </label>
            <input
              autoComplete="off"
              className="sr-only"
              id="honeypot"
              name="honeypot"
              tabIndex={-1}
              type="text"
            />
            <PublicTextField
              id="fullName"
              label="Nombre completo"
              name="fullName"
              autoComplete="name"
              defaultValue={values.fullName}
              error={errors.fullName}
              required
            />
            <PublicTextField
              id="email"
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={values.email}
              error={errors.email}
              required
            />
            <PublicTextField
              id="phone"
              label="Teléfono argentino"
              hint="Con código de área, por ejemplo 351 555 0101."
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={values.phone}
              error={errors.phone}
              required
            />
            <PublicSelectField
              id="turnoId"
              label="Turno"
              name="turnoId"
              defaultValue={values.turnoId}
              options={[
                { value: "", label: "Elegí un turno" },
                ...offer.turnos.map((turno) => ({
                  value: turno.id,
                  label: turno.label,
                })),
              ]}
              required
            />
            <PublicCheckboxField
              id="policy"
              label="Acepto la política de privacidad."
              name="policy"
              error={errors.policy}
              required
            />
            <Button type="submit" className="w-full sm:w-auto sm:self-start">
              Continuar
            </Button>
          </form>
        </>
      )}
    </main>
  );
}
