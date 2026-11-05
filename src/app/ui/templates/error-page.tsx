import { Butterfly } from "../atoms/butterfly";
import { Button, ButtonLink } from "../atoms/button";
import { EmphasizedLastWord } from "../atoms/emphasis";
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
    <section className="mx-auto flex max-w-prose flex-col items-start gap-5 pt-page-top pb-section">
      <div
        aria-hidden="true"
        data-error-art
        className="relative h-32 w-full lg:h-44"
      >
        <Butterfly size="lg" className="left-0 top-0" />
      </div>
      <Heading level={1}>
        <EmphasizedLastWord text={copy.title} />
      </Heading>
      <Text className="text-lead">{copy.message}</Text>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <ButtonLink href="/" className="w-full gap-2 sm:w-fit">
          Volver al inicio
        </ButtonLink>
        {notFound ? null : (
          <Button
            type="button"
            variant="secondary"
            onClick={onRetry}
            className="w-full sm:w-fit"
          >
            Reintentar
          </Button>
        )}
      </div>
      <nav
        aria-label="Otras páginas"
        className="flex flex-col items-start gap-y-1 sm:flex-row sm:flex-wrap sm:gap-x-6"
      >
        <ButtonLink href="/talleres" variant="tertiary">
          Ver talleres
          <Icon name="arrow" size={18} />
        </ButtonLink>
        <ButtonLink href="/intensivos" variant="tertiary">
          Ver workshops
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
