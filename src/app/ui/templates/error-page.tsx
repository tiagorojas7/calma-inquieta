import { Heading } from "../atoms/heading";
import { Text } from "../atoms/text";
import { microcopy } from "../microcopy";
export function ErrorPage({ status = 404 }: { status?: number }) {
  const copy = status === 404 ? microcopy.notFound : microcopy.serverError;
  return (
    <section className="mx-auto flex max-w-prose flex-col gap-4 py-section">
      <Heading level={1}>{copy.title}</Heading>
      <Text>{copy.message}</Text>
      <div className="flex gap-6 text-clay-800 underline underline-offset-4">
        <a href="/">Inicio</a>
        <a href="/contacto">Contacto</a>
      </div>
    </section>
  );
}
