import { ButtonLink } from "../atoms/button";
import { Heading, Text } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { NumberedSteps } from "../molecules/numbered-steps";
import { Receipt, ReceiptFact } from "../molecules/receipt";
import { StatusBadge, type StatusTone } from "../molecules/status-badge";

/** The first step is already done when the page opens: the request exists. */
const CURRENT_STEP = 1;

const TONES: Record<IntensivoRequestSummaryProps["status"], StatusTone> = {
  pending_confirmation: "pending",
  confirmed: "done",
  cancelled: "cancelled",
};

export interface IntensivoRequestSummaryProps {
  copy: {
    title: string;
    reference: string;
    fields: Record<"intensivo" | "date" | "time" | "deposit", string>;
    stepsTitle: string;
    steps: readonly string[];
    currentStep: string;
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
    <main className="mx-auto flex w-full max-w-prose flex-col gap-8 pt-page-top pb-section">
      <header className="flex flex-col gap-3">
        <Heading level={1}>{`${copy.reference} ${reference}`}</Heading>
        <StatusBadge status={status} tone={TONES[status]} label={statusLabel} />
      </header>

      <Receipt id="request-receipt" heading={copy.title}>
        <ReceiptFact label={copy.fields.intensivo}>{intensivoName}</ReceiptFact>
        <ReceiptFact label={copy.fields.date}>{date}</ReceiptFact>
        <ReceiptFact label={copy.fields.time} numeric>
          {time}
        </ReceiptFact>
        <ReceiptFact label={copy.fields.deposit} numeric>
          {deposit}
        </ReceiptFact>
      </Receipt>

      {status === "pending_confirmation" ? (
        <section className="flex flex-col gap-4">
          <Heading level={2} id="request-steps">
            {copy.stepsTitle}
          </Heading>
          <NumberedSteps
            steps={copy.steps}
            current={CURRENT_STEP}
            currentLabel={copy.currentStep}
            labelledBy="request-steps"
          />
          {whatsappHref === null ? null : (
            <ButtonLink href={whatsappHref} className="w-full gap-2 sm:w-fit">
              <Icon name="whatsapp" size={20} />
              {copy.whatsapp}
            </ButtonLink>
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
