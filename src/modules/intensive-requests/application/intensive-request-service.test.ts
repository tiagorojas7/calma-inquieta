import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { InMemoryIntensiveRequestRepository } from "~/testing/fakes/in-memory-intensive-request-repository";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import type { StudentDraft } from "~/modules/enrollments";
import type {
  IntensiveOffer,
  IntensiveOfferProject,
} from "./intensive-offer-lookup";
import { createIntensiveRequestService } from "./intensive-request-service";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("bad money");
  return money.value;
};

const INTENSIVE_ID = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
const NOW = new Date("2026-10-28T15:00:00.000Z");

const PROJECT_A: IntensiveOfferProject = {
  id: "c0000000-0000-4000-8000-00000000000a",
  name: "Taza de torno",
  image: null,
  price: pesos(40000),
  deposit: pesos(15000),
};
const PROJECT_B: IntensiveOfferProject = {
  id: "c0000000-0000-4000-8000-00000000000b",
  name: "Plato hondo",
  image: {
    src: "/media/plato.webp",
    alt: "Un plato",
    width: 800,
    height: 600,
  },
  price: pesos(30000),
  deposit: pesos(10000),
};

function offer(overrides: Partial<IntensiveOffer> = {}): IntensiveOffer {
  return {
    id: INTENSIVE_ID,
    slug: "intensivo-de-ceramica",
    name: "Intensivo de cerámica",
    status: "published",
    upcoming: true,
    eventDate: "2026-11-14",
    startsAt: "10:00",
    endsAt: "14:00",
    price: pesos(40000),
    deposit: pesos(15000),
    capacity: 2,
    minSeats: 4,
    policyText: "Si no llegamos al mínimo, devolvemos la seña.",
    projects: [PROJECT_A],
    ...overrides,
  };
}

function student(overrides: Partial<StudentDraft> = {}): StudentDraft {
  return {
    fullName: "Ana Pérez",
    email: "ANA@example.com ",
    phone: "351 555 0101",
    policyAccepted: true,
    honeypot: "",
    ...overrides,
  };
}

function setup(intensivo: IntensiveOffer | null = offer()) {
  const repository = new InMemoryIntensiveRequestRepository();
  let counter = 0;
  const service = createIntensiveRequestService({
    repository,
    offers: {
      findBySlug: (slug) =>
        Promise.resolve(intensivo?.slug === slug ? intensivo : null),
      findById: (id) =>
        Promise.resolve(intensivo?.id === id ? intensivo : null),
    },
    clock: fixedClock(NOW),
    random: { bytes: (length) => new Uint8Array(length).fill(7) },
    newId: () =>
      `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`,
  });
  return { service, repository };
}

const ADMIN = testAdminActor("duena@example.com");
const SLUG = "intensivo-de-ceramica";
const DEPOSIT_FORM = { amount: "15000", paidOn: "2026-10-27", note: "" };
const BALANCE_FORM = { amount: "25000", paidOn: "2026-10-28", note: "" };
const REFUND_FORM = { amount: "0", refundedOn: "2026-10-28" };

async function onlyRequestId(
  service: ReturnType<typeof setup>["service"],
): Promise<string> {
  const overview = await service.overview(ADMIN, INTENSIVE_ID);
  if (!overview.ok) throw new Error("no overview");
  const [first] = overview.value.requests;
  if (!first) throw new Error("no request");
  return first.id;
}

async function pendingRequest(
  service: ReturnType<typeof setup>["service"],
  overrides: Partial<StudentDraft> = {},
) {
  const sent = await service.requestSeat({
    slug: SLUG,
    projectId: PROJECT_A.id,
    student: student(overrides),
  });
  if (!sent.ok) throw new Error("request refused");
  const view = await service.getRequestByPublicId(sent.value.publicId);
  if (!view.ok) throw new Error("no view");
  return sent.value.publicId;
}

describe("requestSeat", () => {
  it("records a pending request with normalized contact data", async () => {
    const { service, repository } = setup();

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student(),
    });

    expect(sent.ok).toBe(true);
    const [stored] = [...repository.requests.values()];
    expect(stored).toMatchObject({
      intensiveId: INTENSIVE_ID,
      status: "pending_confirmation",
      fullName: "Ana Pérez",
      email: "ana@example.com",
      phoneDigits: "5493515550101",
      createdAt: NOW,
      policyAcceptedAt: NOW,
    });
    expect(sent.ok && sent.value.publicId).toBe(stored?.publicId);
  });

  it("answers a filled honeypot like a success without storing anything", async () => {
    const { service, repository } = setup();

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student({ honeypot: "http://spam" }),
    });

    expect(sent.ok).toBe(true);
    expect(repository.requests.size).toBe(0);
    const decoy = sent.ok ? sent.value.publicId : "";
    expect(await service.getRequestByPublicId(decoy)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("reports every invalid student field", async () => {
    const { service, repository } = setup();

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student({
        fullName: "",
        email: "x",
        phone: "1",
        policyAccepted: false,
      }),
    });

    expect(sent).toMatchObject({
      ok: false,
      error: {
        kind: "invalid",
        issues: [
          { field: "fullName", code: "required" },
          { field: "email", code: "invalid-format" },
          { field: "phone", code: "invalid-format" },
          { field: "policy", code: "required" },
        ],
      },
    });
    expect(repository.requests.size).toBe(0);
  });

  it.each([
    ["an unknown slug", null, "not-found"],
    ["a draft", offer({ status: "draft" }), "not-found"],
    ["a cancelled intensivo", offer({ status: "cancelled" }), "not-found"],
    ["a past intensivo", offer({ upcoming: false }), "not-found"],
    ["a paused intensivo", offer({ status: "paused" }), "requests-closed"],
  ] as const)("refuses %s", async (_name, intensivo, kind) => {
    const { service, repository } = setup(intensivo);

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student(),
    });

    expect(sent).toEqual({ ok: false, error: { kind } });
    expect(repository.requests.size).toBe(0);
  });

  it("refuses new requests once confirmed seats fill the capacity", async () => {
    const { service } = setup(offer({ capacity: 1 }));
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);
    await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      ...DEPOSIT_FORM,
    });

    const late = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student({ email: "bea@example.com" }),
    });

    expect(late).toEqual({ ok: false, error: { kind: "seats-full" } });
  });

  it("refuses a second live request from the same email", async () => {
    const { service } = setup();
    await pendingRequest(service);

    const again = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student({ email: "ana@example.com" }),
    });

    expect(again).toEqual({ ok: false, error: { kind: "duplicate-request" } });
  });

  it("stores the chosen project with a snapshot of its price and deposit", async () => {
    const { service, repository } = setup(
      offer({ projects: [PROJECT_A, PROJECT_B] }),
    );

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_B.id,
      student: student(),
    });

    expect(sent.ok).toBe(true);
    const [stored] = [...repository.requests.values()];
    expect(stored?.projectId).toBe(PROJECT_B.id);
    expect(stored?.price?.toCentavos()).toBe(3_000_000);
    expect(stored?.deposit?.toCentavos()).toBe(1_000_000);
  });

  it.each([
    ["no project", "", "required"],
    [
      "an unknown project",
      "c0000000-0000-4000-8000-0000000000ff",
      "invalid-format",
    ],
  ] as const)(
    "refuses %s and writes nothing",
    async (_name, projectId, code) => {
      const { service, repository } = setup(
        offer({ projects: [PROJECT_A, PROJECT_B] }),
      );

      const sent = await service.requestSeat({
        slug: SLUG,
        projectId,
        student: student(),
      });

      expect(sent).toEqual({
        ok: false,
        error: { kind: "invalid", issues: [{ field: "project", code }] },
      });
      expect(repository.requests.size).toBe(0);
    },
  );

  it("refuses a project that belongs to another workshop", async () => {
    const { service, repository } = setup(offer({ projects: [PROJECT_A] }));

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_B.id,
      student: student(),
    });

    expect(sent).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "project" }] },
    });
    expect(repository.requests.size).toBe(0);
  });

  it("answers invalid when the project disappears between the check and the write", async () => {
    const { service, repository } = setup();
    repository.insert = () =>
      Promise.resolve({ ok: false, error: { kind: "unknown-project" } });

    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_A.id,
      student: student(),
    });

    expect(sent).toEqual({
      ok: false,
      error: {
        kind: "invalid",
        issues: [{ field: "project", code: "invalid-format" }],
      },
    });
  });
});

describe("getRequestByPublicId", () => {
  it("projects only what the summary page needs", async () => {
    const { service } = setup();
    const publicId = await pendingRequest(service);

    const view = await service.getRequestByPublicId(publicId);

    expect(view).toEqual({
      ok: true,
      value: {
        publicId,
        reference: publicId.slice(0, 8),
        status: "pending_confirmation",
        studentName: "Ana Pérez",
        intensivoName: "Intensivo de cerámica",
        eventDate: "2026-11-14",
        startsAt: "10:00",
        endsAt: "14:00",
        projectName: "Taza de torno",
        price: pesos(40000),
        deposit: pesos(15000),
      },
    });
  });

  it("reports the snapshot price and deposit, not the project's current ones", async () => {
    const current = { ...PROJECT_A };
    const catalog = { value: offer({ projects: [current] }) };
    const repository = new InMemoryIntensiveRequestRepository();
    const service = createIntensiveRequestService({
      repository,
      offers: {
        findBySlug: () => Promise.resolve(catalog.value),
        findById: () => Promise.resolve(catalog.value),
      },
      clock: fixedClock(NOW),
      random: { bytes: (length) => new Uint8Array(length).fill(7) },
    });
    const sent = await service.requestSeat({
      slug: SLUG,
      projectId: current.id,
      student: student(),
    });
    if (!sent.ok) throw new Error("request refused");

    catalog.value = offer({
      projects: [
        {
          ...current,
          name: "Renombrada",
          price: pesos(90000),
          deposit: pesos(50000),
        },
      ],
    });
    const view = await service.getRequestByPublicId(sent.value.publicId);

    expect(view).toMatchObject({
      ok: true,
      value: {
        projectName: "Renombrada",
        price: pesos(40000),
        deposit: pesos(15000),
      },
    });
  });

  it("falls back to the workshop terms for a request made before projects", async () => {
    const { service, repository } = setup();
    const publicId = await pendingRequest(service);
    const [stored] = [...repository.requests.values()];
    if (!stored) throw new Error("no request");
    repository.requests.set(stored.id, {
      ...stored,
      projectId: null,
      price: null,
      deposit: null,
    });

    const view = await service.getRequestByPublicId(publicId);

    expect(view).toMatchObject({
      ok: true,
      value: { projectName: null, price: pesos(40000), deposit: pesos(15000) },
    });
  });

  it("answers not-found for a malformed or unknown id", async () => {
    const { service } = setup();

    for (const id of ["", "short", "x".repeat(30)])
      expect(await service.getRequestByPublicId(id)).toEqual({
        ok: false,
        error: { kind: "not-found" },
      });
  });
});

describe("getOffer", () => {
  it("returns the public offer with the seats left", async () => {
    const { service } = setup();
    await pendingRequest(service);

    const found = await service.getOffer(SLUG);

    expect(found).toMatchObject({
      ok: true,
      value: {
        slug: SLUG,
        name: "Intensivo de cerámica",
        projects: [PROJECT_A],
        minSeats: 4,
        policyText: "Si no llegamos al mínimo, devolvemos la seña.",
        seatsLeft: 2,
      },
    });
  });

  it("reports closed, unknown and full intensivos", async () => {
    expect(
      await setup(offer({ status: "paused" })).service.getOffer(SLUG),
    ).toEqual({ ok: false, error: { kind: "requests-closed" } });
    expect(await setup(null).service.getOffer(SLUG)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
    expect(await setup(offer({ capacity: 0 })).service.getOffer(SLUG)).toEqual({
      ok: false,
      error: { kind: "seats-full" },
    });
  });

  it("is unavailable when a dependency fails", async () => {
    const service = createIntensiveRequestService({
      repository: new InMemoryIntensiveRequestRepository(),
      offers: {
        findBySlug: () => Promise.reject(new Error("db down")),
        findById: () => Promise.reject(new Error("db down")),
      },
      clock: fixedClock(NOW),
      random: { bytes: (length) => new Uint8Array(length) },
    });

    expect(await service.getOffer(SLUG)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("a workshop with a single project", () => {
  it("takes a request from the form to a confirmed seat with the project's snapshot terms", async () => {
    const { service, repository } = setup();
    const publicId = await pendingRequest(service);

    const confirmed = await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId: await onlyRequestId(service),
      ...DEPOSIT_FORM,
    });

    expect(confirmed).toMatchObject({
      ok: true,
      value: { status: "confirmed", projectId: PROJECT_A.id },
    });
    expect([...repository.requests.values()][0]?.price?.toCentavos()).toBe(
      4_000_000,
    );
    expect(await service.getRequestByPublicId(publicId)).toMatchObject({
      ok: true,
      value: {
        status: "confirmed",
        projectName: "Taza de torno",
        price: pesos(40000),
        deposit: pesos(15000),
      },
    });
  });
});

describe("listProjects", () => {
  it("lists the projects of a published or paused workshop, full ones included", async () => {
    for (const intensivo of [
      offer({ projects: [PROJECT_A, PROJECT_B] }),
      offer({ status: "paused", projects: [PROJECT_A, PROJECT_B] }),
      offer({ capacity: 0, projects: [PROJECT_A, PROJECT_B] }),
    ])
      expect(await setup(intensivo).service.listProjects(SLUG)).toEqual({
        ok: true,
        value: [PROJECT_A, PROJECT_B],
      });
  });

  it.each([
    ["an unknown slug", null],
    ["a draft", offer({ status: "draft" })],
    ["a past workshop", offer({ upcoming: false })],
  ] as const)("answers not-found for %s", async (_name, intensivo) => {
    expect(await setup(intensivo).service.listProjects(SLUG)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });
});

describe("shared read state", () => {
  it("leaves a new public request unread", async () => {
    const { service, repository } = setup();
    await pendingRequest(service);

    expect([...repository.requests.keys()]).toHaveLength(1);
    expect(repository.seenMarks.size).toBe(0);
  });

  it("marks every request of the intensivo read for both owners, once", async () => {
    const { service, repository } = setup();
    await pendingRequest(service);
    await pendingRequest(service, { email: "bea@example.com" });

    expect(await service.markSeen(ADMIN, INTENSIVE_ID)).toEqual({
      ok: true,
      value: { marked: 2 },
    });
    expect(
      await service.markSeen(
        testAdminActor("second@example.com"),
        INTENSIVE_ID,
      ),
    ).toEqual({ ok: true, value: { marked: 0 } });
    expect([...repository.seenMarks.values()]).toEqual([
      { by: "duena@example.com", at: NOW },
      { by: "duena@example.com", at: NOW },
    ]);
  });

  it("changes neither the statuses nor the overview of the intensivo", async () => {
    const { service } = setup();
    await pendingRequest(service);
    const before = await service.overview(ADMIN, INTENSIVE_ID);

    await service.markSeen(ADMIN, INTENSIVE_ID);

    expect(await service.overview(ADMIN, INTENSIVE_ID)).toEqual(before);
  });

  it("denies without an admin actor", async () => {
    const { service } = setup();

    expect(await service.markSeen(null, INTENSIVE_ID)).toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  it("answers unavailable when the repository fails", async () => {
    const { service, repository } = setup();
    repository.markSeenForIntensive = () => Promise.reject(new Error("down"));

    expect(await service.markSeen(ADMIN, INTENSIVE_ID)).toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });
});

describe("admin", () => {
  it("denies every use case without an admin actor", async () => {
    const { service } = setup();
    const denied = { ok: false, error: { kind: "denied" } };

    expect(await service.overview(null, INTENSIVE_ID)).toEqual(denied);
    expect(
      await service.confirm(null, {
        intensiveId: INTENSIVE_ID,
        requestId: "x",
        ...DEPOSIT_FORM,
      }),
    ).toEqual(denied);
    expect(
      await service.recordBalance(null, {
        intensiveId: INTENSIVE_ID,
        requestId: "x",
        ...BALANCE_FORM,
      }),
    ).toEqual(denied);
    expect(
      await service.cancel(null, {
        intensiveId: INTENSIVE_ID,
        requestId: "x",
        reason: "motivo",
      }),
    ).toEqual(denied);
  });

  it("lists the requests with the confirmed seats and the intensivo terms", async () => {
    const { service } = setup();
    await pendingRequest(service);

    const overview = await service.overview(ADMIN, INTENSIVE_ID);

    expect(overview).toMatchObject({
      ok: true,
      value: {
        intensivo: { id: INTENSIVE_ID, capacity: 2, minSeats: 4 },
        confirmedSeats: 0,
        requests: [{ fullName: "Ana Pérez", status: "pending_confirmation" }],
      },
    });
  });

  it("answers not-found for an unknown intensivo", async () => {
    const { service } = setup(null);

    expect(await service.overview(ADMIN, INTENSIVE_ID)).toEqual({
      ok: false,
      error: { kind: "not-found" },
    });
  });

  it("confirms with the exact deposit and counts the seat", async () => {
    const { service } = setup();
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);

    const confirmed = await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      amount: "$ 15.000",
      paidOn: "2026-10-27",
      note: " transferencia ",
    });

    expect(confirmed).toMatchObject({
      ok: true,
      value: {
        status: "confirmed",
        paidOn: "2026-10-27",
        paymentNote: "transferencia",
        confirmedBy: "duena@example.com",
        confirmedAt: NOW,
      },
    });
    const overview = await service.overview(ADMIN, INTENSIVE_ID);
    expect(overview.ok && overview.value.confirmedSeats).toBe(1);
  });

  it("refuses a different amount or a future date and keeps the request pending", async () => {
    const { service, repository } = setup();
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);
    const base = { intensiveId: INTENSIVE_ID, requestId };

    const wrongAmount = await service.confirm(ADMIN, {
      ...base,
      ...DEPOSIT_FORM,
      amount: "10000",
    });
    const future = await service.confirm(ADMIN, {
      ...base,
      ...DEPOSIT_FORM,
      paidOn: "2026-10-29",
    });

    expect(wrongAmount).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "amount" }] },
    });
    expect(future).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "paidOn" }] },
    });
    expect([...repository.requests.values()][0]?.status).toBe(
      "pending_confirmation",
    );
  });

  it("refuses to confirm past the capacity", async () => {
    const { service } = setup(offer({ capacity: 1 }));
    await pendingRequest(service);
    await pendingRequest(service, { email: "bea@example.com" });
    const overview = await service.overview(ADMIN, INTENSIVE_ID);
    const ids = overview.ok ? overview.value.requests.map((r) => r.id) : [];

    const first = await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId: ids[0] ?? "",
      ...DEPOSIT_FORM,
    });
    const second = await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId: ids[1] ?? "",
      ...DEPOSIT_FORM,
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: { kind: "intensive-full" } });
  });

  it("does not touch a request that belongs to another intensivo", async () => {
    const { service } = setup();
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);

    const confirmed = await service.confirm(ADMIN, {
      intensiveId: "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02",
      requestId,
      ...DEPOSIT_FORM,
    });

    expect(confirmed).toEqual({ ok: false, error: { kind: "not-found" } });
  });

  it("cancels with a reason and frees the confirmed seat", async () => {
    const { service } = setup();
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);
    await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      ...DEPOSIT_FORM,
    });

    const cancelled = await service.cancel(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      reason: "  no puede asistir ",
      refund: REFUND_FORM,
    });

    expect(cancelled).toMatchObject({
      ok: true,
      value: { status: "cancelled", cancelReason: "no puede asistir" },
    });
    const overview = await service.overview(ADMIN, INTENSIVE_ID);
    expect(overview.ok && overview.value.confirmedSeats).toBe(0);
  });

  it("refuses a cancellation without a reason", async () => {
    const { service } = setup();
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);

    const cancelled = await service.cancel(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      reason: " ",
    });

    expect(cancelled).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "reason" }] },
    });
  });

  it("cancels a pending request with no refund and leaves it unpaid", async () => {
    const { service } = setup();
    await pendingRequest(service);
    const requestId = await onlyRequestId(service);

    const cancelled = await service.cancel(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      reason: "cambió de idea",
    });

    expect(cancelled).toMatchObject({
      ok: true,
      value: { status: "cancelled", refund: null, paidAmount: null },
    });
  });
});

/** A request that chose a project, confirmed with the deposit it was quoted. */
async function confirmedRequest(
  context: ReturnType<typeof setup>,
  projectId = PROJECT_A.id,
  deposit = "15000",
) {
  const sent = await context.service.requestSeat({
    slug: SLUG,
    projectId,
    student: student(),
  });
  if (!sent.ok) throw new Error("request refused");
  const requestId = await onlyRequestId(context.service);
  const confirmed = await context.service.confirm(ADMIN, {
    intensiveId: INTENSIVE_ID,
    requestId,
    ...DEPOSIT_FORM,
    amount: deposit,
  });
  if (!confirmed.ok) throw new Error("confirm refused");
  return requestId;
}

describe("confirming against the request snapshot", () => {
  it("asks for the deposit the person was quoted, not the workshop's", async () => {
    const context = setup(offer({ projects: [PROJECT_A, PROJECT_B] }));
    await context.service.requestSeat({
      slug: SLUG,
      projectId: PROJECT_B.id,
      student: student(),
    });
    const requestId = await onlyRequestId(context.service);
    const base = { intensiveId: INTENSIVE_ID, requestId, ...DEPOSIT_FORM };

    const workshopDeposit = await context.service.confirm(ADMIN, base);
    const quoted = await context.service.confirm(ADMIN, {
      ...base,
      amount: "10.000",
    });

    expect(workshopDeposit).toMatchObject({
      ok: false,
      error: { kind: "invalid", issues: [{ field: "amount" }] },
    });
    expect(quoted).toMatchObject({ ok: true, value: { status: "confirmed" } });
    expect(quoted.ok && quoted.value.paidAmount?.toCentavos()).toBe(1_000_000);
  });

  it("keeps asking for the workshop deposit when the request has no snapshot", async () => {
    const { service, repository } = setup();
    await pendingRequest(service);
    const [stored] = [...repository.requests.values()];
    if (!stored) throw new Error("no request");
    repository.requests.set(stored.id, {
      ...stored,
      projectId: null,
      price: null,
      deposit: null,
    });

    const confirmed = await service.confirm(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId: stored.id,
      ...DEPOSIT_FORM,
    });

    expect(confirmed.ok && confirmed.value.paidAmount?.toCentavos()).toBe(
      1_500_000,
    );
  });
});

describe("recordBalance", () => {
  const balanceOf = (
    requestId: string,
    over: Partial<typeof BALANCE_FORM> = {},
  ) => ({
    intensiveId: INTENSIVE_ID,
    requestId,
    ...BALANCE_FORM,
    ...over,
  });

  it("records the snapshot price minus the snapshot deposit with who and when", async () => {
    const context = setup(offer({ projects: [PROJECT_A, PROJECT_B] }));
    const requestId = await confirmedRequest(context, PROJECT_B.id, "10000");

    const paid = await context.service.recordBalance(
      ADMIN,
      balanceOf(requestId, { amount: "$ 20.000", note: " efectivo " }),
    );

    expect(paid).toMatchObject({
      ok: true,
      value: {
        status: "confirmed",
        balance: {
          paidOn: "2026-10-28",
          note: "efectivo",
          by: "duena@example.com",
          at: NOW,
        },
      },
    });
    expect(paid.ok && paid.value.balance?.amount.toCentavos()).toBe(2_000_000);
  });

  it("uses the workshop terms for a request without a snapshot", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);
    const stored = context.repository.requests.get(requestId);
    if (!stored) throw new Error("no request");
    context.repository.requests.set(requestId, {
      ...stored,
      projectId: null,
      price: null,
      deposit: null,
    });

    const paid = await context.service.recordBalance(
      ADMIN,
      balanceOf(requestId),
    );

    expect(paid.ok && paid.value.balance?.amount.toCentavos()).toBe(2_500_000);
  });

  it("refuses an amount that is not the whole balance, a future date and a date before the deposit", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);
    const refused = async (over: Partial<typeof BALANCE_FORM>) => {
      const result = await context.service.recordBalance(
        ADMIN,
        balanceOf(requestId, over),
      );
      return result.ok || result.error.kind !== "invalid"
        ? []
        : result.error.issues.map((issue) => issue.field);
    };

    expect(await refused({ amount: "10000" })).toEqual(["amount"]);
    expect(await refused({ paidOn: "2026-10-29" })).toEqual(["paidOn"]);
    expect(await refused({ paidOn: "2026-10-26" })).toEqual(["paidOn"]);
    expect(context.repository.requests.get(requestId)?.balance).toBeNull();
  });

  it("refuses a second balance and keeps the first", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);
    await context.service.recordBalance(
      ADMIN,
      balanceOf(requestId, { note: "primero" }),
    );

    const again = await context.service.recordBalance(
      ADMIN,
      balanceOf(requestId, { note: "segundo" }),
    );

    expect(again).toEqual({
      ok: false,
      error: { kind: "balance-already-paid" },
    });
    expect(context.repository.requests.get(requestId)?.balance?.note).toBe(
      "primero",
    );
  });

  it("refuses the balance of a pending or cancelled request", async () => {
    const context = setup();
    await pendingRequest(context.service);
    const requestId = await onlyRequestId(context.service);

    expect(
      await context.service.recordBalance(ADMIN, balanceOf(requestId)),
    ).toEqual({
      ok: false,
      error: { kind: "illegal-transition", from: "pending_confirmation" },
    });
    await context.service.cancel(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      reason: "cambió de idea",
    });
    expect(
      await context.service.recordBalance(ADMIN, balanceOf(requestId)),
    ).toEqual({
      ok: false,
      error: { kind: "illegal-transition", from: "cancelled" },
    });
  });

  it("has no balance when the deposit already covered the price", async () => {
    const whole = { ...PROJECT_A, price: pesos(15000), deposit: pesos(15000) };
    const context = setup(offer({ projects: [whole] }));
    const requestId = await confirmedRequest(context);

    const paid = await context.service.recordBalance(
      ADMIN,
      balanceOf(requestId),
    );

    expect(paid).toEqual({ ok: false, error: { kind: "no-balance-due" } });
  });

  it("answers not-found for another intensivo and for an unknown request", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);

    expect(
      await context.service.recordBalance(ADMIN, {
        ...balanceOf(requestId),
        intensiveId: "7c9d1a52-83f4-4b0e-a7a5-5f0e2c4b9a02",
      }),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
    expect(
      await context.service.recordBalance(ADMIN, balanceOf("nope")),
    ).toEqual({ ok: false, error: { kind: "not-found" } });
  });
});

describe("cancelling a request that paid", () => {
  const cancelWith = (
    context: ReturnType<typeof setup>,
    requestId: string,
    refund?: { amount: string; refundedOn: string; note?: string },
  ) =>
    context.service.cancel(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      reason: "no puede asistir",
      ...(refund === undefined ? {} : { refund }),
    });

  it("records a zero refund and keeps the deposit as history", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);

    const cancelled = await cancelWith(context, requestId, REFUND_FORM);

    expect(cancelled).toMatchObject({
      ok: true,
      value: { status: "cancelled", cancelledBy: "duena@example.com" },
    });
    expect(cancelled.ok && cancelled.value.refund?.amount.isZero()).toBe(true);
    expect(cancelled.ok && cancelled.value.paidAmount?.toCentavos()).toBe(
      1_500_000,
    );
  });

  it("requires the refund, refuses one above what was paid, and leaves the request confirmed", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);

    expect(await cancelWith(context, requestId)).toEqual({
      ok: false,
      error: { kind: "invalid-refund", field: "amount", code: "required" },
    });
    expect(
      await cancelWith(context, requestId, { ...REFUND_FORM, amount: "15001" }),
    ).toEqual({
      ok: false,
      error: { kind: "invalid-refund", field: "amount", code: "above-paid" },
    });
    expect(context.repository.requests.get(requestId)?.status).toBe(
      "confirmed",
    );
  });

  it("lets a request that paid its balance get back up to deposit plus balance", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);
    await context.service.recordBalance(ADMIN, {
      intensiveId: INTENSIVE_ID,
      requestId,
      ...BALANCE_FORM,
    });

    const above = await cancelWith(context, requestId, {
      ...REFUND_FORM,
      amount: "40001",
    });
    const all = await cancelWith(context, requestId, {
      ...REFUND_FORM,
      amount: "40.000",
      note: " todo ",
    });

    expect(above).toMatchObject({ ok: false, error: { code: "above-paid" } });
    expect(all.ok && all.value.refund).toEqual({
      amount: pesos(40000),
      refundedOn: "2026-10-28",
      note: "todo",
    });
    expect(all.ok && all.value.balance?.amount.toCentavos()).toBe(2_500_000);
  });

  it("refuses a malformed amount, date or note, and any refund on a pending request", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);

    for (const [refund, field] of [
      [{ ...REFUND_FORM, amount: "12,5" }, "amount"],
      [{ ...REFUND_FORM, refundedOn: "ayer" }, "refundedOn"],
      [{ ...REFUND_FORM, note: "x".repeat(301) }, "note"],
    ] as const)
      expect(await cancelWith(context, requestId, refund)).toMatchObject({
        ok: false,
        error: { kind: "invalid-refund", field },
      });

    const pending = setup();
    await pendingRequest(pending.service);
    expect(
      await cancelWith(
        pending,
        await onlyRequestId(pending.service),
        REFUND_FORM,
      ),
    ).toEqual({
      ok: false,
      error: {
        kind: "invalid-refund",
        field: "amount",
        code: "not-refundable",
      },
    });
  });

  it("changes nothing on a second cancel", async () => {
    const context = setup();
    const requestId = await confirmedRequest(context);
    await cancelWith(context, requestId, { ...REFUND_FORM, amount: "5000" });
    const before = context.repository.requests.get(requestId);

    const again = await cancelWith(context, requestId, REFUND_FORM);

    expect(again).toEqual({
      ok: false,
      error: { kind: "illegal-transition", from: "cancelled" },
    });
    expect(context.repository.requests.get(requestId)).toEqual(before);
  });
});
