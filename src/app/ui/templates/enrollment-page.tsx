import { Button } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";

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
    needsMaterials,
    onContinueToMaterials,
  } = props;
  return (
    <main className="flex max-w-prose flex-col gap-6 py-section">
      <header className="flex flex-col gap-2">
        <Heading level={1}>{offer.workshopName}</Heading>
        <Text>{offer.period}</Text>
        <Text>{offer.fee}</Text>
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
          {formError ? <p role="alert">{formError}</p> : null}
          <form className="flex flex-col gap-4" method="post">
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
            <div className="flex flex-col gap-1">
              <label htmlFor="fullName">Nombre completo</label>
              <input
                defaultValue={values.fullName}
                id="fullName"
                name="fullName"
                required
                type="text"
              />
              {errors.fullName ? (
                <span role="alert">{errors.fullName}</span>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="email">Email</label>
              <input
                defaultValue={values.email}
                id="email"
                name="email"
                required
                type="email"
              />
              {errors.email ? <span role="alert">{errors.email}</span> : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="phone">Teléfono argentino</label>
              <input
                defaultValue={values.phone}
                id="phone"
                name="phone"
                required
                type="tel"
              />
              {errors.phone ? <span role="alert">{errors.phone}</span> : null}
            </div>
            <label className="flex flex-col gap-1" htmlFor="turnoId">
              Turno
              <select
                defaultValue={values.turnoId}
                id="turnoId"
                name="turnoId"
                required
              >
                <option value="">Elegí un turno</option>
                {offer.turnos.map((turno) => (
                  <option key={turno.id} value={turno.id}>
                    {turno.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2" htmlFor="policy">
              <input id="policy" name="policy" required type="checkbox" />
              Acepto la política de privacidad.
            </label>
            {errors.policy ? <span role="alert">{errors.policy}</span> : null}
            <Button type="submit">Continuar</Button>
          </form>
        </>
      )}
    </main>
  );
}
