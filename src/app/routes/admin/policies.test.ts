import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  ORIGIN,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  buildPolicyVersion,
  createInMemoryPolicies,
} from "~/testing/fakes/policy-builders";
import { action, loader } from "./policies";

function setup() {
  const fixture = createInMemoryPolicies([
    buildPolicyVersion({
      kind: "conditions",
      version: 2,
      body: "Condiciones nuevas.",
      publishedBy: "duena@example.com",
      publishedAt: new Date("2026-11-10T15:00:00Z"),
    }),
  ]);
  return { ...fixture, services: { policies: fixture.service } };
}

const load = (services: object, path = "/admin/politicas", admin = true) =>
  loader({
    request: getRequest(path),
    params: {},
    context: adminContext(services, { admin }),
  } as never);

const submit = (
  services: object,
  fields: Record<string, string>,
  options: { admin?: boolean; headers?: Record<string, string> } = {},
) =>
  action({
    request: postRequest(
      "/admin/politicas",
      fields,
      options.headers ?? { Origin: ORIGIN },
    ),
    params: {},
    context: adminContext(services, {
      ...(options.admin === undefined ? {} : { admin: options.admin }),
    }),
  } as never);

describe("admin policies loader", () => {
  it("shows both documents with their current text and a newest-first history", async () => {
    const { services } = setup();

    const result = await load(services);

    expect(result.feedback).toBeNull();
    expect(result.sections.map((section) => section.kind)).toEqual([
      "conditions",
      "privacy",
    ]);
    const [conditions, privacy] = result.sections;
    expect(conditions).toMatchObject({
      title: "Condiciones",
      currentVersion: 2,
      body: "Condiciones nuevas.",
    });
    expect(conditions?.history).toEqual([
      {
        version: 2,
        label: "Versión 2",
        publishedOn: "10/11/2026",
        publishedBy: "duena@example.com",
        body: "Condiciones nuevas.",
        current: true,
      },
      expect.objectContaining({
        version: 1,
        label: "Versión 1",
        publishedBy: "migration 0018",
        publishedOn: "01/11/2026",
        current: false,
      }),
    ]);
    expect(privacy).toMatchObject({ title: "Privacidad", currentVersion: 1 });
    expect(privacy?.history).toHaveLength(1);
  });

  it("shows the success banner only for the published code", async () => {
    const { services } = setup();
    expect(
      (await load(services, "/admin/politicas?ok=published")).feedback,
    ).toBe("published");
    expect(
      (await load(services, "/admin/politicas?ok=otro")).feedback,
    ).toBeNull();
  });

  it("denies a non-admin before reading anything", async () => {
    const { services } = setup();
    expect(
      await thrownStatus(() => load(services, "/admin/politicas", false)),
    ).toBe(403);
  });
});

describe("admin policies action", () => {
  it("publishes the next version of the chosen document and redirects with the feedback code", async () => {
    const { services, repository } = setup();

    const result = (await submit(services, {
      kind: "privacy",
      body: "  Privacidad revisada.  ",
    })) as Response;

    expect(result.status).toBe(302);
    expect(result.headers.get("Location")).toBe(
      "/admin/politicas?ok=published",
    );
    const privacy = repository.versions.filter(
      (item) => item.kind === "privacy",
    );
    expect(privacy.map((item) => item.version)).toEqual([1, 2]);
    expect(privacy[1]).toMatchObject({
      body: "Privacidad revisada.",
      publishedBy: "a@x.test",
    });
    // The other document is untouched.
    expect(
      repository.versions.filter((item) => item.kind === "conditions"),
    ).toHaveLength(2);
  });

  it("returns a blank text as a 422 that keeps what was typed and names the problem", async () => {
    const { services, repository } = setup();

    const result = (await submit(services, {
      kind: "conditions",
      body: "   ",
    })) as unknown as {
      data: { kind: string; body: string; message: string };
      init: { status: number };
    };

    expect(result.init.status).toBe(422);
    expect(result.data).toEqual({
      kind: "conditions",
      body: "   ",
      message: "Completá este campo.",
    });
    expect(repository.versions).toHaveLength(3);
  });

  it("refuses a text identical to the current version with its own wording", async () => {
    const { services, repository } = setup();

    const result = (await submit(services, {
      kind: "conditions",
      body: "Condiciones nuevas.",
    })) as unknown as { data: { message: string }; init: { status: number } };

    expect(result.init.status).toBe(422);
    expect(result.data.message).toBe(
      "Es igual a la versión vigente. Cambiá el texto para publicar una nueva.",
    );
    expect(repository.versions).toHaveLength(3);
  });

  it("answers 400 for an unknown document", async () => {
    const { services, repository } = setup();
    expect(
      await thrownStatus(() => submit(services, { kind: "terms", body: "x" })),
    ).toBe(400);
    expect(repository.versions).toHaveLength(3);
  });

  it("denies a non-admin and a cross-site post, publishing nothing", async () => {
    const { services, repository } = setup();
    expect(
      await thrownStatus(() =>
        submit(services, { kind: "conditions", body: "x" }, { admin: false }),
      ),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        submit(
          services,
          { kind: "conditions", body: "x" },
          { headers: { Origin: "https://evil.example.test" } },
        ),
      ),
    ).toBe(403);
    expect(repository.versions).toHaveLength(3);
  });
});
