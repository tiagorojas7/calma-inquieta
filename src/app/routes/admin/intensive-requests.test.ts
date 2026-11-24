import { describe, expect, it } from "vitest";
import {
  adminContext,
  getRequest,
  postRequest,
  thrownStatus,
} from "~/testing/admin/route-kit";
import { Money } from "~/modules/_shared";
import {
  buildIntensiveOffer,
  buildOfferProject,
  createInMemoryIntensiveRequests,
  FAKE_INTENSIVE_ID,
  FAKE_INTENSIVE_SLUG,
  FAKE_PROJECT_ID,
  FAKE_SECOND_PROJECT_ID,
} from "~/testing/fakes/intensive-request-builders";
import { createUnavailableIntensiveRequestService } from "~/modules/intensive-requests";
import { action, loader } from "./intensive-requests";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad money");
  return money.value;
};

const PATH = `/admin/intensivos/${FAKE_INTENSIVE_ID}/reservas`;
const OTHER_ID = "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02";

async function seeded(capacity = 2) {
  const { service, repository } = createInMemoryIntensiveRequests({
    offer: buildIntensiveOffer({ capacity }),
  });
  for (const email of ["ana@example.com", "bea@example.com"]) {
    await service.requestSeat({
      slug: FAKE_INTENSIVE_SLUG,
      projectId: FAKE_PROJECT_ID,
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

const load = (id: string, services: object, admin = true, query = "") =>
  loader({
    request: getRequest(`/admin/intensivos/${id}/reservas${query}`),
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
      seats: "0 de 2",
    });
    expect(result.groups[0]?.rows.map((row) => row.depositInput)).toEqual([
      "15000",
      "15000",
    ]);
    expect(result.intensivo.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.groups.map((group) => group.rows.length)).toEqual([2, 0, 0]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("shows the project each request chose", async () => {
    const { services } = await seeded();

    const result = await load(FAKE_INTENSIVE_ID, services);

    expect(result.groups[0]?.rows.map((row) => row.projectName)).toEqual([
      "Taza de torno",
      "Taza de torno",
    ]);
  });

  it("reads the filter, the search and the person just acted on from the address", async () => {
    const { services, ids } = await seeded();

    const plain = await load(FAKE_INTENSIVE_ID, services);
    const asked = await load(
      FAKE_INTENSIVE_ID,
      services,
      true,
      `?estado=por-confirmar&buscar=Ana&ver=${ids[0] ?? ""}`,
    );
    const unknown = await load(FAKE_INTENSIVE_ID, services, true, "?estado=x");

    expect(plain.browse).toEqual({ filter: "todas", search: "", focus: null });
    expect(asked.browse).toEqual({
      filter: "por-confirmar",
      search: "Ana",
      focus: ids[0],
    });
    expect(unknown.browse.filter).toBe("todas");
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
    expect(response.headers.get("Location")).toBe(`${PATH}?ok=confirmed`);
    expect(repository.requests.get(ids[0] ?? "")).toMatchObject({
      status: "confirmed",
      paidOn: "2026-10-27",
      paymentNote: "transferencia",
      confirmedBy: "a@x.test",
    });
  });

  it("comes back to the same person on the page the form was on", async () => {
    const { services, ids } = await seeded();
    const id = ids[0] ?? "";

    const response = (await post(
      {
        ...CONFIRM,
        requestId: id,
        returnTo: PATH,
        anchor: `reserva-${id}`,
      },
      services,
    )) as Response;

    expect(response.headers.get("Location")).toBe(
      `${PATH}?ok=confirmed#reserva-${id}`,
    );
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

  const REFUND = { refundAmount: "0", refundedOn: "2026-10-27" };

  it("confirms against the deposit of the project the person chose", async () => {
    const second = buildOfferProject({
      id: FAKE_SECOND_PROJECT_ID,
      name: "Plato hondo",
      deposit: pesos(10000),
    });
    const context = createInMemoryIntensiveRequests({
      offer: buildIntensiveOffer({ projects: [buildOfferProject(), second] }),
    });
    await context.service.requestSeat({
      slug: FAKE_INTENSIVE_SLUG,
      projectId: FAKE_SECOND_PROJECT_ID,
      student: {
        fullName: "Ana Pérez",
        email: "ana@example.com",
        phone: "351 555 0101",
        policyAccepted: true,
        honeypot: "",
      },
    });
    const id = [...context.repository.requests.keys()][0] ?? "";
    const services = { intensiveRequests: context.service };

    const workshopDeposit = (await post(
      { ...CONFIRM, requestId: id },
      services,
    )) as Rejected;
    const quoted = (await post(
      { ...CONFIRM, amount: "10000", requestId: id },
      services,
    )) as Response;

    expect(workshopDeposit.init.status).toBe(422);
    expect(workshopDeposit.data.feedback.errors["amount"]).toContain(
      "seña completa",
    );
    expect(quoted.status).toBe(302);
    expect(context.repository.requests.get(id)?.paidAmount?.toCentavos()).toBe(
      1_000_000,
    );
  });

  describe("balance", () => {
    const BALANCE = {
      intent: "balance",
      amount: "25000",
      paidOn: "2026-10-27",
    };

    async function confirmed() {
      const context = await seeded();
      const id = context.ids[0] ?? "";
      await post({ ...CONFIRM, requestId: id }, context.services);
      return { ...context, id };
    }

    it("records the full balance and redirects back with the banner code", async () => {
      const { repository, services, id } = await confirmed();

      const response = (await post(
        { ...BALANCE, requestId: id, note: "efectivo" },
        services,
      )) as Response;

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(`${PATH}?ok=balance`);
      expect(repository.requests.get(id)?.balance).toMatchObject({
        paidOn: "2026-10-27",
        note: "efectivo",
        by: "a@x.test",
      });
      expect(repository.requests.get(id)?.balance?.amount.toCentavos()).toBe(
        2_500_000,
      );
    });

    it("rejects another amount next to the field and keeps the values", async () => {
      const { repository, services, id } = await confirmed();

      const result = (await post(
        { ...BALANCE, amount: "10000", requestId: id, note: "" },
        services,
      )) as Rejected;

      expect(result.init.status).toBe(422);
      expect(result.data.feedback).toMatchObject({
        requestId: id,
        intent: "balance",
        values: { amount: "10000", paidOn: "2026-10-27" },
      });
      expect(result.data.feedback.errors["amount"]).toContain("saldo completo");
      expect(repository.requests.get(id)?.balance).toBeNull();
    });

    it("rejects a date before the deposit, a second balance and a pending request", async () => {
      const { services, ids, id } = await confirmed();

      const early = (await post(
        { ...BALANCE, paidOn: "2026-10-20", requestId: id },
        services,
      )) as Rejected;
      expect(early.data.feedback.errors["paidOn"]).toContain(
        "anterior a la seña",
      );

      await post({ ...BALANCE, requestId: id }, services);
      const again = (await post(
        { ...BALANCE, requestId: id },
        services,
      )) as Rejected;
      expect(again.data.feedback.formError).toContain("ya estaba registrado");

      const pending = (await post(
        { ...BALANCE, requestId: ids[1] ?? "" },
        services,
      )) as Rejected;
      expect(pending.init.status).toBe(422);
      expect(pending.data.feedback.formError).toContain("seña confirmada");
    });
  });

  describe("cancelling a confirmed request", () => {
    async function confirmed() {
      const context = await seeded();
      const id = context.ids[0] ?? "";
      await post({ ...CONFIRM, requestId: id }, context.services);
      return { ...context, id };
    }
    const CANCEL = { intent: "cancel", reason: "no puede asistir" };

    it("records the refund and redirects back", async () => {
      const { repository, services, id } = await confirmed();

      const response = (await post(
        {
          ...CANCEL,
          requestId: id,
          ...REFUND,
          refundAmount: "5.000",
          refundNote: "parcial",
        },
        services,
      )) as Response;

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(`${PATH}?ok=cancelled`);
      const stored = repository.requests.get(id);
      expect(stored?.status).toBe("cancelled");
      expect(stored?.refund).toMatchObject({
        refundedOn: "2026-10-27",
        note: "parcial",
      });
      expect(stored?.refund?.amount.toCentavos()).toBe(500_000);
    });

    it("accepts a refund of 0", async () => {
      const { repository, services, id } = await confirmed();

      const response = (await post(
        { ...CANCEL, requestId: id, ...REFUND },
        services,
      )) as Response;

      expect(response.status).toBe(302);
      expect(repository.requests.get(id)?.refund?.amount.isZero()).toBe(true);
    });

    it("asks for the refund when the form carries none, and keeps the request confirmed", async () => {
      const { repository, services, id } = await confirmed();

      const result = (await post(
        { ...CANCEL, requestId: id },
        services,
      )) as Rejected;

      expect(result.init.status).toBe(422);
      expect(result.data.feedback).toMatchObject({
        requestId: id,
        intent: "cancel",
        values: { reason: "no puede asistir" },
      });
      expect(result.data.feedback.errors["refundAmount"]).toContain(
        "cuánto devolviste",
      );
      expect(repository.requests.get(id)?.status).toBe("confirmed");
    });

    it("rejects a refund above what was paid and keeps what was typed", async () => {
      const { repository, services, id } = await confirmed();

      const result = (await post(
        {
          ...CANCEL,
          requestId: id,
          ...REFUND,
          refundAmount: "15001",
          refundNote: "x",
        },
        services,
      )) as Rejected;

      expect(result.data.feedback.errors["refundAmount"]).toContain(
        "mayor que lo cobrado",
      );
      expect(result.data.feedback.values).toEqual({
        reason: "no puede asistir",
        refundAmount: "15001",
        refundedOn: "2026-10-27",
        refundNote: "x",
      });
      expect(repository.requests.get(id)?.status).toBe("confirmed");
    });
  });
});

describe("opening the reservations of a workshop marks them read for both owners", () => {
  it("stamps every request of that workshop with the opener and keeps the first mark", async () => {
    const { repository, services, ids } = await seeded();

    await load(FAKE_INTENSIVE_ID, services);
    await load(FAKE_INTENSIVE_ID, services);

    expect([...repository.seenMarks.keys()].sort()).toEqual([...ids].sort());
    for (const mark of repository.seenMarks.values())
      expect(mark.by).toBe("a@x.test");
  });

  it("returns the same page data as before the mark", async () => {
    const { services } = await seeded();
    const first = await load(FAKE_INTENSIVE_ID, services);

    expect(await load(FAKE_INTENSIVE_ID, services)).toEqual(first);
  });

  it("marks nothing for an unknown workshop, a bad id or a non-admin", async () => {
    const { repository, services } = await seeded();

    expect(await thrownStatus(() => load(OTHER_ID, services))).toBe(404);
    expect(await thrownStatus(() => load("no-uuid", services))).toBe(404);
    expect(
      await thrownStatus(() => load(FAKE_INTENSIVE_ID, services, false)),
    ).toBe(403);
    expect(repository.seenMarks.size).toBe(0);
  });

  it("still shows the reservations when marking them fails", async () => {
    const { repository, services } = await seeded();
    repository.markSeenForIntensive = () =>
      Promise.reject(new Error("db down"));

    const result = await load(FAKE_INTENSIVE_ID, services);

    expect(result.groups.map((group) => group.rows.length)).toEqual([2, 0, 0]);
  });
});
