import { describe, expect, it } from "vitest";
import { createPrivateEventService } from "~/modules/private-events";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryPrivateEventRepository } from "~/testing/fakes/in-memory-private-event-repository";
import { createTestServices } from "~/testing/fakes/app-services";
import { createLoaderArgs } from "~/testing/react-router";
import { action, loader, meta } from "./private-event-request";

const ID = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";

function setup() {
  const repository = new InMemoryPrivateEventRepository();
  const services = createTestServices({
    site: { baseUrl: "https://calma.example", indexingEnabled: true },
    privateEvents: createPrivateEventService({
      repository,
      clock: fixedClock(new Date("2026-10-28T15:00:00.000Z")),
      newId: () => ID,
    }),
  });
  return { repository, services };
}

const VALID = {
  fullName: "Ana Pérez",
  phone: "351 555 0101",
  email: "",
  desiredDate: "2026-12-05",
  place: "Casa en Nueva Córdoba",
  participants: "12",
  notes: "",
};

function post(
  services: ReturnType<typeof createTestServices>,
  fields: Record<string, string>,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return action({
    ...createLoaderArgs(services, "/eventos-privados"),
    request: new Request("http://localhost/eventos-privados", {
      method: "POST",
      body: form,
    }),
  } as never);
}

describe("private event request loader", () => {
  it("offers the form with a prefilled WhatsApp link and today as the minimum date", async () => {
    const { services } = setup();

    const result = await loader(
      createLoaderArgs(services, "/eventos-privados") as never,
    );

    expect(result.sent).toBe(false);
    expect(result.whatsappHref).toContain("https://wa.me/");
    expect(decodeURIComponent(result.whatsappHref ?? "")).toContain(
      "evento privado",
    );
    expect(result.instagramHref).toContain("instagram.com");
    expect(result.minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.site.baseUrl).toBe("https://calma.example");
  });

  it("shows the thank-you state after a successful post", async () => {
    const { services } = setup();

    const result = await loader(
      createLoaderArgs(services, "/eventos-privados?enviado=1") as never,
    );

    expect(result.sent).toBe(true);
  });
});

describe("private event request action", () => {
  it("stores a valid request and redirects to the thank-you state", async () => {
    const { repository, services } = setup();

    const response = (await post(services, VALID)) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/eventos-privados?enviado=1",
    );
    expect(repository.requests.get(ID)).toMatchObject({
      fullName: "Ana Pérez",
      phoneDigits: "5493515550101",
      participants: 12,
      status: "nueva",
    });
  });

  it("answers a honeypot like success without storing", async () => {
    const { repository, services } = setup();

    const response = (await post(services, {
      ...VALID,
      honeypot: "bot",
    })) as Response;

    expect(response.status).toBe(302);
    expect(repository.requests.size).toBe(0);
  });

  it("returns field errors and keeps the values when invalid", async () => {
    const { repository, services } = setup();
    const submitted = {
      ...VALID,
      fullName: "",
      desiredDate: "2020-01-01",
      participants: "500",
    };

    const result = (await post(services, submitted)) as {
      data: { values: Record<string, string>; errors: object };
      init: { status: number };
    };

    expect(result.init.status).toBe(422);
    expect(result.data.values).toEqual(submitted);
    expect(result.data.errors).toEqual({
      fullName: "Ingresá tu nombre y apellido.",
      desiredDate: "Elegí una fecha de hoy en adelante.",
      participants: "Ingresá una cantidad de personas entre 1 y 200.",
    });
    expect(repository.requests.size).toBe(0);
  });
});

describe("private event request meta", () => {
  it("keeps canonical and indexable SEO tags", () => {
    const tags = meta({
      loaderData: {
        site: { baseUrl: "https://calma.example", indexingEnabled: true },
      },
      error: undefined,
    } as never);

    expect(tags).toEqual(
      expect.arrayContaining([
        { title: "Eventos privados | Calma Inquieta" },
        {
          tagName: "link",
          rel: "canonical",
          href: "https://calma.example/eventos-privados",
        },
      ]),
    );
    expect(
      tags.some(
        (tag) =>
          "name" in tag &&
          tag.name === "robots" &&
          tag.content.includes("noindex"),
      ),
    ).toBe(false);
  });

  it("is noindex on an error", () => {
    expect(
      meta({ loaderData: undefined, error: new Error("x") } as never),
    ).toEqual(
      expect.arrayContaining([
        { name: "robots", content: "noindex, nofollow" },
      ]),
    );
  });
});
