import { describe, expect, it } from "vitest";
import type { IntensiveOffer } from "~/modules/intensive-requests";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildIntensiveOffer,
  buildOfferProject,
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_SLUG,
  FAKE_PROJECT_ID,
  FAKE_SECOND_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { createLoaderArgs } from "~/testing/react-router";
import {
  buildPolicyVersion,
  createInMemoryPolicies,
} from "~/testing/fakes/policy-builders";
import { action, loader, meta } from "./intensive-request";

const PATH = `/intensivos/${FAKE_INTENSIVE_SLUG}/reserva`;

function setup(offer: IntensiveOffer | null = buildIntensiveOffer()) {
  // The documents the page shows are the ones the service accepts.
  const policies = createInMemoryPolicies([
    buildPolicyVersion({ kind: "conditions", version: 2, body: "Nueva." }),
  ]).service;
  const { service, repository } = createInMemoryIntensiveRequests({
    offer,
    policies,
  });
  return {
    repository,
    services: createTestServices({ intensiveRequests: service, policies }),
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
  project: FAKE_PROJECT_ID,
  conditionsVersion: "2",
  privacyVersion: "1",
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
  it("returns plain data with the projects and the conditions visible", async () => {
    const { services } = setup();

    const result = await open(services);

    expect(result.intensivo.name).toBe("Intensivo de cerámica");
    expect(result.projects).toEqual([
      {
        id: FAKE_PROJECT_ID,
        name: "Taza de torno",
        total: expect.stringMatching(/^\$\s40\.000$/) as string,
        deposit: expect.stringMatching(/^\$\s15\.000$/) as string,
      },
    ]);
    expect(result.conditions.policyText).toBe(
      "Si no llegamos al mínimo, devolvemos la seña.",
    );
    expect(result.conditions.minSeats).toContain("mínimo de 4 personas");
    expect(result.conditions.minSeats).toContain("inasistencia");
    expect(result.backHref).toBe(`/intensivos/${FAKE_INTENSIVE_SLUG}`);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("lists every project in admin order with its image, total and deposit", async () => {
    const { services } = setup(
      buildIntensiveOffer({
        projects: [
          buildOfferProject(),
          buildOfferProject({
            id: FAKE_SECOND_PROJECT_ID,
            name: "Plato hondo",
            image: {
              src: "/media/plato.webp",
              alt: "Un plato",
              width: 800,
              height: 600,
            },
          }),
        ],
      }),
    );

    const result = await open(services);

    expect(result.projects.map((project) => project.name)).toEqual([
      "Taza de torno",
      "Plato hondo",
    ]);
    expect(result.projects[1]?.image).toEqual({
      src: "/media/plato.webp",
      alt: "Un plato",
      width: 800,
      height: 600,
    });
    expect(result.projects[0]).not.toHaveProperty("image");
  });

  it("hands each project its description when it has one", async () => {
    const { services } = setup(
      buildIntensiveOffer({
        projects: [
          buildOfferProject({ description: "Una taza en el torno." }),
          buildOfferProject({ id: FAKE_SECOND_PROJECT_ID, name: "Plato" }),
        ],
      }),
    );

    const result = await open(services);

    expect(result.projects[0]?.description).toBe("Una taza en el torno.");
    expect(result.projects[1]).not.toHaveProperty("description");
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

describe("intensive request policy acceptance", () => {
  it("hands the page the current version of each document to post back", async () => {
    const { services } = setup();
    expect((await open(services)).policies).toEqual({
      conditionsVersion: 2,
      privacyVersion: 1,
    });
  });

  it("still renders the form, without versions, when the documents cannot be read", async () => {
    const { service } = createInMemoryIntensiveRequests();
    const services = createTestServices({ intensiveRequests: service });
    const result = await open(services);
    expect(result.policies).toBeNull();
    expect(result.projects).toHaveLength(1);
  });

  it("stores the posted versions with the request", async () => {
    const { repository, services } = setup();
    await post(services, VALID);
    const [stored] = [...repository.requests.values()];
    expect(stored?.acceptance).toEqual({
      conditionsVersion: 2,
      privacyVersion: 1,
    });
    expect(stored?.policyAcceptedAt).toBeInstanceOf(Date);
  });

  it("tells the visitor the documents changed when a version is unknown, and stores nothing", async () => {
    const { repository, services } = setup();
    const result = (await post(services, {
      ...VALID,
      conditionsVersion: "9",
    })) as unknown as {
      data: { values: Record<string, string>; errors: Record<string, string> };
      init: { status: number };
    };
    expect(result.init.status).toBe(422);
    expect(result.data.errors).toEqual({
      policy: "Las condiciones cambiaron. Volvé a leerlas y aceptalas.",
    });
    expect(result.data.values.fullName).toBe("Ana Pérez");
    expect(repository.requests.size).toBe(0);
  });

  it("fails closed with the unavailable message when the form carried no versions", async () => {
    const { repository, raw } = createInMemoryIntensiveRequests();
    const services = createTestServices({ intensiveRequests: raw });
    const { fullName, email, phone, policy, project } = VALID;
    const withoutVersions = { fullName, email, phone, policy, project };
    const result = (await post(services, withoutVersions)) as unknown as {
      data: { formError: string; errors: object };
      init: { status: number };
    };
    expect(result.init.status).toBe(503);
    expect(result.data.formError).toBe(
      "No pudimos registrar tu solicitud. Probá de nuevo en un rato.",
    );
    expect(result.data.errors).toEqual({});
    expect(repository.requests.size).toBe(0);
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
      projectId: FAKE_PROJECT_ID,
    });
    expect(stored?.price?.toCentavos()).toBe(4_000_000);
    expect(stored?.deposit?.toCentavos()).toBe(1_500_000);
  });

  it("refuses a missing, unknown or foreign project next to the choice and keeps the values", async () => {
    for (const project of [undefined, "no-existe", FAKE_SECOND_PROJECT_ID]) {
      const { repository, services } = setup();
      const { fullName, email, phone, policy } = VALID;
      const base = { fullName, email, phone, policy };
      const fields = project === undefined ? base : { ...base, project };

      const result = (await post(services, fields)) as unknown as {
        data: {
          values: Record<string, string>;
          errors: Record<string, string>;
        };
        init: { status: number };
      };

      expect(result.init.status).toBe(422);
      expect(result.data.errors).toEqual({
        project: "Elegí un proyecto de la lista.",
      });
      expect(result.data.values.fullName).toBe("Ana Pérez");
      expect(result.data.values.projectId).toBe(project ?? "");
      expect(repository.requests.size).toBe(0);
    }
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
    expect(result.data.values).toEqual({ ...submitted, projectId: "" });
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
