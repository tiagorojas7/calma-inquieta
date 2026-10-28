import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import {
  buildIntensiveOffer,
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_ID,
  FAKE_INTENSIVE_SLUG,
} from "~/testing/fakes/intensive-request-builders";
import { createUnavailableIntensiveRequestService } from "~/modules/intensive-requests";
import { action, loader } from "./intensive-requests";

const PATH = `/admin/intensivos/${FAKE_INTENSIVE_ID}/reservas`;
const OTHER_ID = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";

async function seeded(capacity = 2) {
  const { service, repository } = createInMemoryIntensiveRequests({
    offer: buildIntensiveOffer({ capacity }),
  });
  for (const email of ["ana@example.com", "bea@example.com"]) {
    await service.requestSeat({
      slug: FAKE_INTENSIVE_SLUG,
      student: {
        fullName: email.startsWith("ana") ? "Ana Pérez" : "Bea Gómez",
        email,
        phone: "351 555 0101",
        policyAccepted: true,
        honeypot: "",
      },
    });
  }
  const ids = [...repository.requests.values()].map((request) => request.id);
  return { repository, services: { intensiveRequests: service }, ids };
}

const load = (id: string, services: object, admin = true) =>
  loader({
    request: getRequest(`/admin/intensivos/${id}/reservas`),
    params: { id },
    context: adminContext(services, { admin }),
  } as never);

const post = (
  fields: Record<string, string>,
  services: object,
  options: { id?: string; admin?: boolean } = {},
) =>
  action({
    request: postRequest(PATH, fields),
    params: { id: options.id ?? FAKE_INTENSIVE_ID },
    context: adminContext(services, { admin: options.admin ?? true }),
  } as never);

type Rejected = {
  data: {
    feedback: {
      requestId: string;
      intent: string;
      formError: string | undefined;
      errors: Record<string, string>;
      values: Record<string, string>;
    };
  };
  init: { status: number };
};

describe("admin intensive requests loader", () => {
  it("lists the requests of the intensivo grouped by status", async () => {
    const { services } = await seeded();

    const result = await load(FAKE_INTENSIVE_ID, services);

    expect(result.intensivo).toMatchObject({
      name: "Intensivo de cerámica",
      depositInput: "15000",
      seats: "0 de 2",
    });
    expect(result.intensivo.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.groups.map((group) => group.rows.length)).toEqual([2, 0, 0]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("answers 404 for a non-UUID or unknown intensivo, 403 for a non-admin and 503 when unavailable", async () => {
    const { services } = await seeded();

    expect(await thrownStatus(() => load("no-uuid", services))).toBe(404);
    expect(await thrownStatus(() => load(OTHER_ID, services))).toBe(404);
    expect(
      await thrownStatus(() => load(FAKE_INTENSIVE_ID, services, false)),
    ).toBe(403);
    expect(
      await thrownStatus(() =>
        load(FAKE_INTENSIVE_ID, {
          intensiveRequests: createUnavailableIntensiveRequestService(),
        }),
      ),
    ).toBe(503);
  });
});

describe("admin intensive requests action", () => {
  const CONFIRM = { intent: "confirm", amount: "15000", paidOn: "2026-10-27" };

  it("confirms with the deposit, counts the seat and redirects back", async () => {
    const { repository, services, ids } = await seeded();

    const response = (await post(
      { ...CONFIRM, requestId: ids[0] ?? "", note: "transferencia" },
      services,
    )) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(PATH);
    expect(repository.requests.get(ids[0] ?? "")).toMatchObject({
      status: "confirmed",
      paidOn: "2026-10-27",
      paymentNote: "transferencia",
      confirmedBy: "a@x.test",
    });
  });

  it("rejects a different amount next to the field and keeps the values", async () => {
    const { repository, services, ids } = await seeded();

    const result = (await post(
      { ...CONFIRM, amount: "10000", requestId: ids[0] ?? "", note: "" },
      services,
    )) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.feedback).toMatchObject({
      requestId: ids[0],
      intent: "confirm",
      values: { amount: "10000", paidOn: "2026-10-27" },
    });
    expect(result.data.feedback.errors["amount"]).toContain("seña completa");
    expect(repository.requests.get(ids[0] ?? "")?.status).toBe(
      "pending_confirmation",
    );
  });

  it("rejects a future payment date", async () => {
    const { services, ids } = await seeded();

    const result = (await post(
      { ...CONFIRM, paidOn: "2026-10-29", requestId: ids[0] ?? "" },
      services,
    )) as Rejected;

    expect(result.data.feedback.errors["paidOn"]).toContain("fecha válida");
  });

  it("says so when the intensivo is full", async () => {
    const { services, ids } = await seeded(1);
    await post({ ...CONFIRM, requestId: ids[0] ?? "" }, services);

    const result = (await post(
      { ...CONFIRM, requestId: ids[1] ?? "" },
      services,
    )) as Rejected;

    expect(result.init.status).toBe(422);
    expect(result.data.feedback.formError).toContain("todos sus lugares");
  });

  it("says so when the request is no longer pending", async () => {
    const { services, ids } = await seeded();
    await post({ ...CONFIRM, requestId: ids[0] ?? "" }, services);

    const result = (await post(
      { ...CONFIRM, requestId: ids[0] ?? "" },
      services,
    )) as Rejected;

    expect(result.data.feedback.formError).toContain("ya no está pendiente");
  });

  it("cancels with a reason, and rejects a missing reason", async () => {
    const { repository, services, ids } = await seeded();

    const rejected = (await post(
      { intent: "cancel", requestId: ids[0] ?? "", reason: " " },
      services,
    )) as Rejected;
    expect(rejected.data.feedback.errors["reason"]).toContain("motivo");

    const response = (await post(
      { intent: "cancel", requestId: ids[0] ?? "", reason: "no puede asistir" },
      services,
    )) as Response;
    expect(response.status).toBe(302);
    expect(repository.requests.get(ids[0] ?? "")).toMatchObject({
      status: "cancelled",
      cancelReason: "no puede asistir",
      cancelledBy: "a@x.test",
    });
  });

  it("answers 400 for an unknown intent, 404 for unknown ids and 403 for a non-admin", async () => {
    const { services, ids } = await seeded();

    expect(
      await thrownStatus(() =>
        post({ intent: "delete", requestId: ids[0] ?? "" }, services),
      ),
    ).toBe(400);
    expect(
      await thrownStatus(() =>
        post({ ...CONFIRM, requestId: "nope" }, services),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post({ ...CONFIRM, requestId: OTHER_ID }, services),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post({ ...CONFIRM, requestId: ids[0] ?? "" }, services, { id: "x" }),
      ),
    ).toBe(404);
    expect(
      await thrownStatus(() =>
        post({ ...CONFIRM, requestId: ids[0] ?? "" }, services, {
          admin: false,
        }),
      ),
    ).toBe(403);
  });
});
