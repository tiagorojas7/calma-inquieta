import { ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";

export interface IntensivoRequestSummaryProps {
  copy: {
    title: string;
    reference: string;
    fields: Record<"intensivo" | "date" | "time" | "deposit", string>;
    stepsTitle: string;
    steps: readonly string[];
    whatsapp: string;
    confirmed: string;
    cancelled: string;
    cancelledCta: string;
  };
  reference: string;
  status: "pending_confirmation" | "confirmed" | "cancelled";
  statusLabel: string;
  intensivoName: string;
  date: string;
  time: string;
  deposit: string;
  whatsappHref: string | null;
  workshopsHref: string;
}

/** Public summary of a seat request: plain structural props, no application types. */
export function IntensivoRequestSummaryPage({
  copy,
  reference,
  status,
  statusLabel,
  intensivoName,
  date,
  time,
  deposit,
  whatsappHref,
  workshopsHref,
}: IntensivoRequestSummaryProps) {
  return (
    <main className="flex max-w-prose flex-col gap-8 pt-page-top pb-section">
      <header className="flex flex-col gap-2">
        <Heading level={1}>{`${copy.reference} ${reference}`}</Heading>
        <Text tone="accent">{statusLabel}</Text>
      </header>

      <dl className="grid gap-2">
        <dt>{copy.fields.intensivo}</dt>
        <dd>{intensivoName}</dd>
        <dt>{copy.fields.date}</dt>
        <dd>{date}</dd>
        <dt>{copy.fields.time}</dt>
        <dd>{time}</dd>
        <dt>{copy.fields.deposit}</dt>
        <dd>{deposit}</dd>
      </dl>

      {status === "pending_confirmation" ? (
        <section className="flex flex-col gap-3">
          <Heading level={2} id="request-steps">
            {copy.stepsTitle}
          </Heading>
          <ol aria-labelledby="request-steps" className="list-decimal pl-6">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {whatsappHref === null ? null : (
            <ButtonLink href={whatsappHref}>{copy.whatsapp}</ButtonLink>
          )}
        </section>
      ) : null}

      {status === "confirmed" ? <Text>{copy.confirmed}</Text> : null}
      {status === "cancelled" ? (
        <section className="flex flex-col items-start gap-3">
          <Text>{copy.cancelled}</Text>
          <ButtonLink href={workshopsHref}>{copy.cancelledCta}</ButtonLink>
        </section>
      ) : null}
    </main>
  );
}
