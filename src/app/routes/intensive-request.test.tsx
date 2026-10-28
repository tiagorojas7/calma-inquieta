import { describe, expect, it } from "vitest";
import type { IntensiveOffer } from "~/modules/intensive-requests";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildIntensiveOffer,
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_SLUG,
} from "~/testing/fakes/intensive-request-builders";
import { createLoaderArgs } from "~/testing/react-router";
import { action, loader, meta } from "./intensive-request";

const PATH = `/intensivos/${FAKE_INTENSIVE_SLUG}/reserva`;

function setup(offer: IntensiveOffer | null = buildIntensiveOffer()) {
  const { service, repository } = createInMemoryIntensiveRequests({ offer });
  return {
    repository,
    services: createTestServices({ intensiveRequests: service }),
  };
}

function args(services: ReturnType<typeof createTestServices>) {
  return {
    ...createLoaderArgs(services, PATH),
    params: { slug: FAKE_INTENSIVE_SLUG },
  } as never;
}

const VALID = {
  fullName: "Ana Pérez",
  email: "ana@example.com",
  phone: "351 555 0101",
  policy: "on",
};

function post(
  services: ReturnType<typeof createTestServices>,
  fields: Record<string, string>,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return action({
    ...createLoaderArgs(services, PATH),
    params: { slug: FAKE_INTENSIVE_SLUG },
    request: new Request(`http://localhost${PATH}`, {
      method: "POST",
      body: form,
    }),
  } as never);
}

/** The loader's data, failing the test if it redirected instead. */
async function open(services: ReturnType<typeof createTestServices>) {
  const result = await loader(args(services));
  if (result instanceof Response) throw new Error("unexpected redirect");
  return result;
}

describe("intensive request loader", () => {
  it("returns plain data with the deposit and the conditions visible", async () => {
    const { services } = setup();

    const result = await open(services);

    expect(result.intensivo.name).toBe("Intensivo de cerámica");
    expect(result.intensivo.deposit.replace(/\s/g, " ")).toBe("$ 15.000");
    expect(result.conditions.policyText).toBe(
      "Si no llegamos al mínimo, devolvemos la seña.",
    );
    expect(result.conditions.minSeats).toContain("mínimo de 4 personas");
    expect(result.conditions.minSeats).toContain("inasistencia");
    expect(result.backHref).toBe(`/intensivos/${FAKE_INTENSIVE_SLUG}`);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("answers the same bare 404 for an unknown or hidden intensivo", async () => {
    for (const offer of [null, buildIntensiveOffer({ status: "draft" })]) {
      const { services } = setup(offer);
      await expect(loader(args(services))).rejects.toMatchObject({
        data: null,
        init: { status: 404 },
      });
    }
  });

  it("sends a paused or full intensivo back to its page", async () => {
    for (const offer of [
      buildIntensiveOffer({ status: "paused" }),
      buildIntensiveOffer({ capacity: 0 }),
    ]) {
      const { services } = setup(offer);
      const redirected = await loader(args(services));
      expect(redirected).toBeInstanceOf(Response);
      expect((redirected as Response).status).toBe(302);
      expect((redirected as Response).headers.get("Location")).toBe(
        `/intensivos/${FAKE_INTENSIVE_SLUG}`,
      );
    }
  });

  it("fails closed with 503 when the service is unavailable", async () => {
    const services = createTestServices();
    await expect(loader(args(services))).rejects.toMatchObject({
      init: { status: 503 },
    });
  });
});

describe("intensive request action", () => {
  it("stores the request and redirects to its summary page", async () => {
    const { repository, services } = setup();

    const response = (await post(services, VALID)) as Response;

    expect(response.status).toBe(302);
    const [stored] = [...repository.requests.values()];
    expect(response.headers.get("Location")).toBe(
      `/reserva/${stored?.publicId ?? ""}`,
    );
    expect(stored).toMatchObject({
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phoneDigits: "5493515550101",
      status: "pending_confirmation",
    });
  });

  it("answers a honeypot like success without storing", async () => {
    const { repository, services } = setup();

    const response = (await post(services, {
      ...VALID,
      honeypot: "bot",
    })) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toMatch(/^\/reserva\//);
    expect(repository.requests.size).toBe(0);
  });

  it("returns field errors next to the fields and keeps the values", async () => {
    const { repository, services } = setup();
    const submitted = { fullName: "", email: "mal", phone: "12" };

    const result = (await post(services, submitted)) as unknown as {
      data: { values: Record<string, string>; errors: object };
      init: { status: number };
    };

    expect(result.init.status).toBe(422);
    expect(result.data.values).toEqual(submitted);
    expect(result.data.errors).toEqual({
      fullName: "Ingresá tu nombre completo.",
      email: "Ingresá un correo electrónico válido.",
      phone: "Ingresá un teléfono argentino válido.",
      policy: "Tenés que aceptar las condiciones y la política de privacidad.",
    });
    expect(repository.requests.size).toBe(0);
  });

  it("explains a duplicate request above the form", async () => {
    const { services } = setup();
    await post(services, VALID);

    const result = (await post(services, VALID)) as {
      data: { formError: string };
      init: { status: number };
    };

    expect(result.init.status).toBe(409);
    expect(result.data.formError).toContain("solicitud activa");
  });

  it("redirects a closed intensivo back to its page and 404s an unknown one", async () => {
    const closed = (await post(
      setup(buildIntensiveOffer({ status: "paused" })).services,
      VALID,
    ).catch((reason: unknown) => reason)) as Response;
    expect(closed.status).toBe(302);
    expect(closed.headers.get("Location")).toBe(
      `/intensivos/${FAKE_INTENSIVE_SLUG}`,
    );

    await expect(post(setup(null).services, VALID)).rejects.toMatchObject({
      init: { status: 404 },
    });
  });
});

describe("intensive request meta", () => {
  it("is titled and not indexable", () => {
    expect(meta()).toEqual([
      { title: "Reservar mi lugar" },
      { name: "robots", content: "noindex, nofollow" },
    ]);
  });
});
