import { describe, expect, it } from "vitest";
import { createPrivateEventService } from "~/modules/private-events";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryPrivateEventRepository } from "~/testing/fakes/in-memory-private-event-repository";
import {
  action as detailAction,
  loader as detailLoader,
} from "./private-event-detail";
import { loader as listLoader } from "./private-events";

const ID = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
const NOW = new Date("2026-10-28T15:00:00.000Z");

async function seeded() {
  const repository = new InMemoryPrivateEventRepository();
  const privateEvents = createPrivateEventService({
    repository,
    clock: fixedClock(NOW),
    newId: () => ID,
  });
  await privateEvents.requestEvent({
    fullName: "Ana Pérez",
    phone: "351 555 0101",
    email: "",
    desiredDate: "2026-12-05",
    place: "Casa en Nueva Córdoba",
    participants: "12",
    notes: "Cumpleaños",
    honeypot: "",
  });
  return { repository, services: { privateEvents } };
}

describe("admin private events list route", () => {
  it("projects display rows and rejects a non-admin", async () => {
    const { services } = await seeded();

    const result = await listLoader({
      request: getRequest("/admin/eventos"),
      params: {},
      context: adminContext(services),
    } as never);

    expect(result.filter).toBe("");
    expect(result.rows).toEqual([
      {
        id: ID,
        receivedOn: "28/10/2026",
        name: "Ana Pérez",
        desiredDate: "05/12/2026",
        place: "Casa en Nueva Córdoba",
        participants: 12,
        status: "nueva",
        statusLabel: "Nueva",
      },
    ]);
    expect(
      await thrownStatus(() =>
        listLoader({
          request: getRequest("/admin/eventos"),
          params: {},
          context: adminContext(services, { admin: false }),
        } as never),
      ),
    ).toBe(403);
  });

  it("filters by status and ignores an unknown one", async () => {
    const { services } = await seeded();
    const load = (path: string) =>
      listLoader({
        request: getRequest(path),
        params: {},
        context: adminContext(services),
      } as never);

    expect((await load("/admin/eventos?estado=cerrada")).rows).toEqual([]);
    expect((await load("/admin/eventos?estado=nueva")).filter).toBe("nueva");
    const unknown = await load("/admin/eventos?estado=zzz");
    expect(unknown.filter).toBe("");
    expect(unknown.rows).toHaveLength(1);
  });
});

describe("admin private event detail route", () => {
  const detail = (id: string, services: object, admin = true) =>
    detailLoader({
      request: getRequest(`/admin/eventos/${id}`),
      params: { id },
      context: adminContext(services, { admin }),
    } as never);

  it("shows every contact field", async () => {
    const { services } = await seeded();

    const result = await detail(ID, services);

    expect(result).toMatchObject({
      id: ID,
      name: "Ana Pérez",
      phone: "5493515550101",
      email: null,
      desiredDate: "05/12/2026",
      place: "Casa en Nueva Córdoba",
      participants: 12,
      notes: "Cumpleaños",
      status: "nueva",
      statusChanged: null,
    });
    expect(result.whatsappHref).toContain("https://wa.me/5493515550101");
  });

  it("answers 404 for a non-UUID or unknown id and 403 for a non-admin", async () => {
    const { services } = await seeded();

    expect(await thrownStatus(() => detail("no-uuid", services))).toBe(404);
    expect(
      await thrownStatus(() =>
        detail("7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02", services),
      ),
    ).toBe(404);
    expect(await thrownStatus(() => detail(ID, services, false))).toBe(403);
  });

  it("changes the status and redirects back to the detail", async () => {
    const { repository, services } = await seeded();

    const response = (await detailAction({
      request: postRequest(`/admin/eventos/${ID}`, { status: "contactada" }),
      params: { id: ID },
      context: adminContext(services),
    } as never)) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`/admin/eventos/${ID}`);
    expect(repository.requests.get(ID)).toMatchObject({
      status: "contactada",
      statusChangedBy: "a@x.test",
    });
  });

  it("refuses an unknown status without changing anything", async () => {
    const { repository, services } = await seeded();

    const result = (await detailAction({
      request: postRequest(`/admin/eventos/${ID}`, { status: "otra" }),
      params: { id: ID },
      context: adminContext(services),
    } as never)) as { data: { formError: string }; init: { status: number } };

    expect(result.init.status).toBe(422);
    expect(result.data.formError).toContain("Elegí un estado");
    expect(repository.requests.get(ID)?.status).toBe("nueva");
  });

  it("guards the action: 404 for a bad id, 403 for a cross-origin or non-admin post", async () => {
    const { services } = await seeded();
    const run = (id: string, headers?: Record<string, string>, admin = true) =>
      detailAction({
        request: postRequest(
          `/admin/eventos/${id}`,
          { status: "cerrada" },
          headers,
        ),
        params: { id },
        context: adminContext(services, { admin }),
      } as never);

    expect(await thrownStatus(() => run("no-uuid"))).toBe(404);
    expect(
      await thrownStatus(() => run(ID, { Origin: "https://evil.example" })),
    ).toBe(403);
    expect(await thrownStatus(() => run(ID, undefined, false))).toBe(403);
  });
});
