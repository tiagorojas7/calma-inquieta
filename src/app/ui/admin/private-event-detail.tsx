import type { ReactNode } from "react";
import { Heading } from "../atoms/heading";
import { AdminButtonLink } from "./admin-button-link";
import { FormError, SelectField } from "./form-fields";
import { adminMicrocopy } from "./microcopy";
import { PrivateEventStatusBadge } from "./private-event-status-badge";

export interface PrivateEventDetailData {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly whatsappHref: string | undefined;
  readonly email: string | null;
  readonly desiredDate: string;
  readonly place: string;
  readonly participants: number;
  readonly notes: string | null;
  readonly receivedAt: string;
  readonly status: string;
  readonly statusLabel: string;
  /** "who, when" of the last status change; null while the request is new. */
  readonly statusChanged: string | null;
  readonly statusOptions: readonly { value: string; label: string }[];
}

const copy = adminMicrocopy.privateEvents;

const linkClasses =
  "inline-flex min-h-11 items-center text-clay-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  );
}

/** One request with its contact data and the status form (native post). */
export function PrivateEventDetail({
  request,
  formError,
}: {
  request: PrivateEventDetailData;
  formError?: string | undefined;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Heading level={1}>{copy.detailTitle}</Heading>
        <PrivateEventStatusBadge
          status={request.status}
          label={request.statusLabel}
        />
      </div>
      <AdminButtonLink variant="outline" href="/admin/eventos">
        {copy.back}
      </AdminButtonLink>

      <dl className="grid gap-4 md:grid-cols-2">
        <Fact label={copy.fields.name}>{request.name}</Fact>
        <Fact label={copy.fields.phone}>
          {request.phone}
          {request.whatsappHref ? (
            <>
              {" "}
              <a
                href={request.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClasses}
              >
                {copy.whatsapp}
              </a>
            </>
          ) : null}
        </Fact>
        <Fact label={copy.fields.email}>{request.email ?? copy.noEmail}</Fact>
        <Fact label={copy.fields.received}>{request.receivedAt}</Fact>
        <Fact label={copy.fields.date}>{request.desiredDate}</Fact>
        <Fact label={copy.fields.place}>{request.place}</Fact>
        <Fact label={copy.fields.participants}>
          {String(request.participants)}
        </Fact>
        <Fact label={copy.fields.notes}>{request.notes ?? copy.noNotes}</Fact>
        {request.statusChanged ? (
          <Fact label={copy.fields.statusChanged}>{request.statusChanged}</Fact>
        ) : null}
      </dl>

      <form
        method="post"
        aria-label={copy.statusForm.label}
        className="flex max-w-prose flex-col gap-3"
      >
        <FormError message={formError} />
        <SelectField
          label={copy.statusForm.field}
          name="status"
          defaultValue={request.status}
          options={request.statusOptions}
        />
        <div>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
          >
            {copy.statusForm.save}
          </button>
        </div>
      </form>
    </section>
  );
}
