import { ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
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
  "Envianos tu pedido por WhatsApp con el número de pedido.",
  "Te respondemos con los datos para pagar.",
  "Hacé el pago de la cuota y los materiales.",
  "Confirmamos tu lugar y te avisamos por WhatsApp.",
] as const;

const SETTLED_STATUSES = ["paid", "materials_requested", "materials_received"];

/** Public order summary with plain structural props and no application dependencies. */
export function OrderPage(props: OrderPageProps) {
  const pending = props.status === "pending_confirmation";
  const settled = SETTLED_STATUSES.includes(props.status);

  return (
    <main className="flex flex-col gap-6 py-section">
      <header className="flex flex-col gap-2">
        <Heading level={1}>{`Pedido ${props.number}`}</Heading>
        <Text tone="accent">{props.statusLabel}</Text>
      </header>

      <dl className="grid gap-2">
        <dt>Taller</dt>
        <dd>{props.workshopName}</dd>
        <dt>Mes</dt>
        <dd>{props.month}</dd>
        <dt>Turno</dt>
        <dd>{props.turno}</dd>
        <dt>Cuota</dt>
        <dd>{props.fee}</dd>
      </dl>

      {props.lines.length > 0 ? (
        <section className="flex flex-col gap-2">
          <Heading level={2}>Materiales</Heading>
          <ul className="flex flex-col gap-1">
            {props.lines.map((line) => (
              <li key={line.label}>
                <Text>{`${line.label} ×${String(line.quantity)}`}</Text>
                <Text>{line.lineTotal}</Text>
              </li>
            ))}
          </ul>
          <Text>{`Materiales: ${props.materialsTotal}`}</Text>
        </section>
      ) : null}

      <section className="flex flex-col gap-1">
        <Text>Total</Text>
        <Text>{props.total}</Text>
      </section>

      {pending ? (
        <section className="flex flex-col gap-3">
          <Heading level={2} id="payment-steps">
            Cómo pagar
          </Heading>
          <ol aria-labelledby="payment-steps" className="list-decimal pl-6">
            {PAYMENT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {props.whatsappHref === null ? null : (
            <ButtonLink href={props.whatsappHref}>
              Enviar pedido por WhatsApp
            </ButtonLink>
          )}
        </section>
      ) : null}

      {settled ? (
        <Text>
          ¡Gracias! Tu pago está confirmado y tu lugar está reservado.
        </Text>
      ) : null}
    </main>
  );
}
