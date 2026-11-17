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
});
