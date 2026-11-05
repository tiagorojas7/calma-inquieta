import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Text } from "../atoms/text";
import { NumberedSteps } from "../molecules/numbered-steps";
import { Receipt, ReceiptFact } from "../molecules/receipt";
import { StatusBadge, type StatusTone } from "../molecules/status-badge";

export interface OrderPageProps {
  number: string;
  status: string;
  statusLabel: string;
  workshopName: string;
  month: string;
  turno: string;
  lines: readonly { label: string; quantity: number; lineTotal: string }[];
  fee: string;
  materialsTotal: string;
  total: string;
  whatsappHref: string | null;
}

const PAYMENT_STEPS = [
  "Enviá tu pedido por WhatsApp con el número de pedido.",
  "Te respondemos con los datos para pagar.",
  "Hacé el pago de la cuota y los materiales.",
  "Confirmamos tu lugar y te avisamos por WhatsApp.",
] as const;

const SETTLED_STATUSES = ["paid", "materials_requested", "materials_received"];

function statusPresentation(status: string): {
  tone: StatusTone;
  next: string | null;
} {
  if (status === "pending_confirmation") {
    return {
      tone: "pending",
      next: "Enviá tu pedido por WhatsApp para recibir los datos de pago.",
    };
  }
  if (status === "cancelled") {
    return {
      tone: "cancelled",
      next: "Este pedido fue cancelado. Si fue un error, escribinos desde Contacto.",
    };
  }
  return {
    tone: "done",
    next: "Tu pago está confirmado y tu lugar está reservado.",
  };
}

function ContactFallback({ number }: { number: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md bg-sand-100 p-4">
      <Text>
        {`No pudimos armar el enlace de WhatsApp. Anotá tu número de pedido (${number}) y escribinos desde Contacto.`}
      </Text>
      <ButtonLink href="/contacto" variant="secondary">
        Ir a Contacto
      </ButtonLink>
    </div>
  );
}

/** Public order summary with plain structural props and no application dependencies. */
export function OrderPage(props: OrderPageProps) {
  const pending = props.status === "pending_confirmation";
  const settled = SETTLED_STATUSES.includes(props.status);
  const { tone, next } = statusPresentation(props.status);

  return (
    <main className="mx-auto flex w-full max-w-prose flex-col gap-8 pt-page-top pb-section">
      <header className="flex flex-col gap-3">
        <Heading level={1}>
          Pedido <span className="whitespace-nowrap">{props.number}</span>
        </Heading>
        <StatusBadge
          status={props.status}
          tone={tone}
          label={props.statusLabel}
        />
        {next ? <Text>{next}</Text> : null}
      </header>

      <Receipt id="order-receipt" heading="Resumen del pedido">
        <ReceiptFact label="Taller">{props.workshopName}</ReceiptFact>
        <ReceiptFact label="Mes">{props.month}</ReceiptFact>
        <ReceiptFact label="Turno">{props.turno}</ReceiptFact>
        <ReceiptFact label="Cuota" numeric>
          {props.fee}
        </ReceiptFact>
        {props.lines.length > 0 ? (
          <>
            {props.lines.map((line) => (
              <ReceiptLine key={line.label} line={line} />
            ))}
            <ReceiptFact label="Materiales" numeric>
              {props.materialsTotal}
            </ReceiptFact>
          </>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-clay-600 pt-3">
          <dt className="text-base font-semibold text-ink-900">Total</dt>
          <dd className="text-right font-display text-h3 tabular-nums text-ink-900">
            {props.total}
          </dd>
        </div>
      </Receipt>

      {pending ? (
        <section className="flex flex-col gap-4">
          <Heading level={2} id="payment-steps">
            Cómo pagar
          </Heading>
          <NumberedSteps
            steps={PAYMENT_STEPS}
            current={0}
            currentLabel="Ahora"
            labelledBy="payment-steps"
          />
          {props.whatsappHref === null ? (
            <ContactFallback number={props.number} />
          ) : (
            <ButtonLink
              href={props.whatsappHref}
              className="w-full gap-2 sm:w-fit"
            >
              <Icon name="whatsapp" size={20} />
              Enviar pedido por WhatsApp
            </ButtonLink>
          )}
        </section>
      ) : null}

      {props.status === "cancelled" ? (
        <ButtonLink href="/contacto" variant="secondary" className="w-fit">
          Ir a Contacto
        </ButtonLink>
      ) : null}

      {settled ? (
        <Text>
          ¡Gracias! Tu pago está confirmado y tu lugar está reservado.
        </Text>
      ) : null}
    </main>
  );
}

function ReceiptLine({
  line,
}: {
  line: { label: string; quantity: number; lineTotal: string };
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-ink-700">{`${line.label} ×${String(line.quantity)}`}</dt>
      <dd className="shrink-0 text-right text-sm tabular-nums text-ink-700">
        {line.lineTotal}
      </dd>
    </div>
  );
}
