import { AdminPageHeader } from "./admin-page";

export interface ReminderRecipientRow {
  readonly key: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly link: string | null;
}

export interface RemindersListProps {
  readonly values: {
    readonly mensaje: string;
    readonly alumna: string;
    readonly taller: string;
    readonly turno: string;
  };
  readonly workshops: readonly { id: string; name: string }[];
  readonly turnos: readonly string[];
  readonly result: {
    readonly preview: string;
    readonly recipients: readonly ReminderRecipientRow[];
  } | null;
}

const taskButtonClasses = (active: boolean) =>
  `min-h-12 w-full rounded-md px-4 py-3 text-left font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 ${
    active
      ? "bg-clay-800 text-white shadow-button"
      : "border border-admin-line bg-surface text-clay-800 hover:bg-sand-100"
  }`;

const fieldClasses =
  "min-h-12 w-full rounded-md border border-admin-line bg-surface px-3 text-base text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";

/**
 * Two operational reminder views. The server prepares each message and the
 * owner still opens every WhatsApp conversation and sends it manually.
 */
export function RemindersList({
  values,
  workshops,
  turnos,
  result,
}: RemindersListProps) {
  const isClassView = values.mensaje !== "fee";

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <AdminPageHeader
        title="Recordatorios"
        description="Elegí una tarea, filtrá la lista y abrí cada conversación en WhatsApp."
        breadcrumbs={[
          { label: "Panel", href: "/admin" },
          { label: "Recordatorios" },
        ]}
      />

      <form
        role="search"
        method="get"
        action="/admin/recordatorios"
        aria-label="Buscar recordatorios"
        className="flex min-w-0 flex-col gap-5"
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-3 font-display text-xl font-semibold text-ink-900">
            Elegí qué necesitás resolver
          </legend>
          <button
            type="submit"
            name="mensaje"
            value="class"
            aria-pressed={isClassView}
            className={taskButtonClasses(isClassView)}
          >
            Clases de mañana
          </button>
          <button
            type="submit"
            name="mensaje"
            value="fee"
            aria-pressed={!isClassView}
            className={taskButtonClasses(!isClassView)}
          >
            Pagos pendientes
          </button>
        </fieldset>

        <div className="grid min-w-0 gap-4 rounded-md bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-2 font-semibold text-ink-900">
            Buscar alumna
            <input
              type="search"
              name="alumna"
              defaultValue={values.alumna}
              placeholder="Nombre o apellido"
              className={fieldClasses}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-2 font-semibold text-ink-900">
            Taller
            <select
              name="taller"
              defaultValue={values.taller}
              className={fieldClasses}
            >
              <option value="">Todos los talleres</option>
              {workshops.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2 font-semibold text-ink-900">
            Turno
            <select
              name="turno"
              defaultValue={values.turno}
              className={fieldClasses}
            >
              <option value="">Todos los turnos</option>
              {turnos.map((turno) => (
                <option key={turno} value={turno}>
                  {turno}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            name="mensaje"
            value={isClassView ? "class" : "fee"}
            className="min-h-12 rounded-md bg-clay-600 px-5 py-3 font-semibold text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 sm:col-span-2 lg:col-span-3 lg:justify-self-start"
          >
            Aplicar filtros
          </button>
        </div>
      </form>

      {result === null ? (
        <p className="max-w-prose text-ink-700">
          Elegí una de las dos tareas para preparar la lista.
        </p>
      ) : result.recipients.length === 0 ? (
        <div className="rounded-md bg-surface p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold text-ink-900">
            No hay resultados
          </h2>
          <p className="mt-1 text-ink-700">
            Probá con otro nombre, taller o turno.
          </p>
        </div>
      ) : (
        <section
          aria-labelledby="reminder-results"
          className="flex flex-col gap-3"
        >
          <div>
            <h2
              id="reminder-results"
              className="font-display text-2xl font-semibold text-ink-900"
            >
              {isClassView ? "Clases de mañana" : "Pagos pendientes"}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-ink-700">
              El mensaje queda preparado: no se envía automáticamente.
            </p>
          </div>
          <ul className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            {result.recipients.map((recipient) => (
              <li
                key={recipient.key}
                className="flex min-w-0 flex-col gap-3 rounded-md bg-surface p-4 shadow-card"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{recipient.name}</p>
                  <p className="mt-1 break-words text-sm text-ink-700">
                    {recipient.message}
                  </p>
                </div>
                {recipient.link === null ? (
                  <p className="text-sm font-semibold text-terracotta-800">
                    Sin teléfono válido
                  </p>
                ) : (
                  <a
                    href={recipient.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir WhatsApp para ${recipient.name}`}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-clay-600 px-5 py-3 font-semibold text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 sm:w-auto sm:self-start"
                  >
                    Abrir WhatsApp
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
