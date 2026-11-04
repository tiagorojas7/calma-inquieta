import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon, type IconName } from "../atoms/icon";
import { Text } from "../atoms/text";

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
  icon: IconName;
  next: string | null;
} {
  if (status === "pending_confirmation") {
    return {
      icon: "clock",
      next: "Enviá tu pedido por WhatsApp para recibir los datos de pago.",
    };
  }
  if (status === "cancelled") {
    return {
      icon: "close",
      next: "Este pedido fue cancelado. Si fue un error, escribinos desde Contacto.",
    };
  }
  return {
    icon: "heart",
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

function PaymentSteps() {
  return (
    <ol aria-labelledby="payment-steps" className="flex flex-col gap-3">
      {PAYMENT_STEPS.map((step, at) => {
        const current = at === 0;
        return (
          <li
            key={step}
            {...(current ? { "aria-current": "step" as const } : {})}
            className="flex items-start gap-3"
          >
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold tabular-nums ${current ? "border-clay-600 bg-clay-600 text-white" : "border-clay-600 text-clay-800"}`}
            >
              {at + 1}
            </span>
            <span className="flex flex-col gap-1 pt-1">
              {current ? (
                <span className="text-sm font-semibold text-clay-800">
                  Ahora
                </span>
              ) : null}
              <span>{step}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Public order summary with plain structural props and no application dependencies. */
export function OrderPage(props: OrderPageProps) {
  const pending = props.status === "pending_confirmation";
  const settled = SETTLED_STATUSES.includes(props.status);
  const { icon, next } = statusPresentation(props.status);

  return (
    <main className="flex flex-col gap-8 pt-page-top pb-section">
      <header className="flex flex-col gap-3">
        <Heading level={1}>{`Pedido ${props.number}`}</Heading>
        <p
          data-status={props.status}
          className="inline-flex w-fit items-center gap-2 rounded-pill bg-sand-200 px-3 py-1 text-sm font-semibold text-clay-800"
        >
          <Icon name={icon} size={18} />
          <span>{props.statusLabel}</span>
        </p>
        {next ? <Text>{next}</Text> : null}
      </header>

      <section
        aria-labelledby="order-receipt"
        className="flex flex-col gap-4 rounded-md bg-white p-6 shadow-card"
      >
        <Heading level={2} id="order-receipt">
          Resumen del pedido
        </Heading>
        <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2">
          <dt className="text-sm font-semibold text-ink-600">Taller</dt>
          <dd className="text-right">{props.workshopName}</dd>
          <dt className="text-sm font-semibold text-ink-600">Mes</dt>
          <dd className="text-right">{props.month}</dd>
          <dt className="text-sm font-semibold text-ink-600">Turno</dt>
          <dd className="text-right">{props.turno}</dd>
          <dt className="text-sm font-semibold text-ink-600">Cuota</dt>
          <dd className="text-right tabular-nums">{props.fee}</dd>
          {props.lines.length > 0 ? (
            <>
              {props.lines.map((line) => (
                <ReceiptLine key={line.label} line={line} />
              ))}
              <dt className="text-sm font-semibold text-ink-600">Materiales</dt>
              <dd className="text-right tabular-nums">
                {props.materialsTotal}
              </dd>
            </>
          ) : null}
          <dt className="mt-2 border-t-2 border-clay-600 pt-3 text-base font-semibold text-ink-900">
            Total
          </dt>
          <dd className="mt-2 border-t-2 border-clay-600 pt-3 text-right font-display text-h3 tabular-nums text-ink-900">
            {props.total}
          </dd>
        </dl>
      </section>

      {pending ? (
        <section className="flex flex-col gap-4">
          <Heading level={2} id="payment-steps">
            Cómo pagar
          </Heading>
          <PaymentSteps />
          {props.whatsappHref === null ? (
            <ContactFallback number={props.number} />
          ) : (
            <ButtonLink href={props.whatsappHref} className="gap-2">
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
    <>
      <dt className="text-sm text-ink-700">{`${line.label} ×${String(line.quantity)}`}</dt>
      <dd className="text-right text-sm tabular-nums text-ink-700">
        {line.lineTotal}
      </dd>
    </>
  );
}
