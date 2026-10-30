import { Butterfly } from "../atoms/butterfly";
import { Button, ButtonLink } from "../atoms/button";
import { Heading } from "../atoms/heading";
import { Icon } from "../atoms/icon";
import { Text } from "../atoms/text";
import { microcopy } from "../microcopy";

function reloadPage() {
  window.location.reload();
}

/**
 * Recovery screen for 404 and server errors: one primary route home, retry
 * only when the failure may be transient, and tertiary routes to the main
 * destinations. Links are router links, so navigating away never reloads.
 */
export function ErrorPage({
  status = 404,
  onRetry = reloadPage,
}: {
  status?: number;
  onRetry?: () => void;
}) {
  const notFound = status === 404;
  const copy = notFound ? microcopy.notFound : microcopy.serverError;
  return (
    <section className="mx-auto flex max-w-prose flex-col items-start gap-5 py-section">
      <div
        aria-hidden="true"
        data-error-art
        className="relative h-32 w-full lg:h-44"
      >
        <Butterfly size="lg" className="left-0 top-0" />
      </div>
      <Heading level={1}>{copy.title}</Heading>
      <Text>{copy.message}</Text>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink href="/" className="gap-2">
          Volver al inicio
        </ButtonLink>
        {notFound ? null : (
          <Button type="button" variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
      <nav
        aria-label="Otras páginas"
        className="flex flex-wrap gap-x-6 gap-y-1"
      >
        <ButtonLink href="/talleres" variant="tertiary">
          Ver talleres
          <Icon name="arrow" size={18} />
        </ButtonLink>
        <ButtonLink href="/intensivos" variant="tertiary">
          Ver intensivos
          <Icon name="arrow" size={18} />
        </ButtonLink>
        <ButtonLink href="/contacto" variant="tertiary">
          Contacto
          <Icon name="arrow" size={18} />
        </ButtonLink>
      </nav>
    </section>
  );
}
