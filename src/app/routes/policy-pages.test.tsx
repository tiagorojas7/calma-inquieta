import { describe, expect, it } from "vitest";
import { createUnavailablePoliciesService } from "~/modules/policies";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildPolicyVersion,
  createInMemoryPolicies,
} from "~/testing/fakes/policy-builders";
import { createLoaderArgs } from "~/testing/react-router";
import * as conditions from "./condiciones";
import * as privacy from "./privacidad";

const pages = [
  {
    name: "condiciones",
    module: conditions,
    path: "/condiciones",
    title: "Condiciones",
    kind: "conditions",
  },
  {
    name: "privacidad",
    module: privacy,
    path: "/privacidad",
    title: "Política de privacidad",
    kind: "privacy",
  },
] as const;

describe.each(pages)("$name page", ({ module, path, title, kind }) => {
  it("shows the latest version of its own document as plain paragraphs", async () => {
    const { service } = createInMemoryPolicies([
      buildPolicyVersion({
        kind,
        version: 2,
        body: "Primera línea.\n\nSegunda <b>línea</b>.",
        publishedAt: new Date("2026-11-17T15:00:00Z"),
      }),
    ]);
    const services = createTestServices({ policies: service });

    const result = await module.loader(
      createLoaderArgs(services, path) as never,
    );

    expect(result).toMatchObject({
      title,
      versionLine: "Versión 2 · publicada el 17/11/2026",
      paragraphs: ["Primera línea.", "Segunda <b>línea</b>."],
    });
  });

  it("does not show the other document", async () => {
    const { service } = createInMemoryPolicies();
    const services = createTestServices({ policies: service });

    const result = await module.loader(
      createLoaderArgs(services, path) as never,
    );

    expect(JSON.stringify(result)).not.toContain(
      kind === "conditions"
        ? "Usamos tus datos solo"
        : "La cuota mensual se abona",
    );
  });

  it("answers 503 when the document cannot be read", async () => {
    const services = createTestServices({
      policies: createUnavailablePoliciesService(),
    });

    await expect(
      module.loader(createLoaderArgs(services, path) as never),
    ).rejects.toMatchObject({ init: { status: 503 } });
  });

  it("is titled and carries its canonical address", async () => {
    const services = createTestServices({
      policies: createInMemoryPolicies().service,
    });
    const loaderData = await module.loader(
      createLoaderArgs(services, path) as never,
    );

    const tags = module.meta({ loaderData } as never) as {
      title?: string;
      href?: string;
    }[];

    expect(tags[0]?.title).toBe(`${title} | Calma Inquieta`);
    expect(tags.find((tag) => tag.href)?.href).toBe(
      `https://example.test${path}`,
    );
  });
});
