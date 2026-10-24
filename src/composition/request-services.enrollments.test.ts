import { describe, expect, it } from "vitest";
import { testAdminActor } from "~/testing/fakes/admin-actor";
import { createIsolateState, createRequestServices } from "./request-services";

const UNREACHABLE_URL = "postgres://postgres@127.0.0.1:1/none";

const services = (databaseUrl = UNREACHABLE_URL) =>
  createRequestServices(
    {
      databaseUrl,
      buildCommit: "abc",
      siteUrl: "https://calma.example.test",
      indexingEnabled: false,
      mediaBucket: null,
    },
    {},
    createIsolateState(),
  );

const enrollmentRequest = {
  slug: "ceramica",
  period: "2099-01",
  turnoId: "turno-1",
  student: {
    fullName: "Ada Lovelace",
    email: "ada@example.test",
    phone: "+54 351 555 0100",
    policyAccepted: true,
    honeypot: "",
  },
  lines: [],
};

describe("createRequestServices enrollments", () => {
  it("exposes real public and administrative enrollment use cases when a database is configured", async () => {
    const requestServices = services();

    await expect(
      requestServices.publicEnrollments.requestEnrollment({
        ...enrollmentRequest,
        student: { ...enrollmentRequest.student, fullName: "" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid" },
    });
    await expect(
      requestServices.enrollments.confirmPayment(testAdminActor(), {
        orderId: "order-1",
        amount: "12.50",
        paidOn: "2026-10-24",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { kind: "invalid" },
    });
  });

  it("uses unavailable public and administrative enrollment services without a database", async () => {
    const requestServices = services("");

    await expect(
      requestServices.publicEnrollments.requestEnrollment(enrollmentRequest),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
    await expect(
      requestServices.enrollments.list(testAdminActor()),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  it("denies an invalid actor before the unavailable administrative service", async () => {
    await expect(services("").enrollments.list(null)).resolves.toEqual({
      ok: false,
      error: { kind: "denied" },
    });
  });

  it("does not create an order through unavailable public enrollment", async () => {
    const requestServices = services("");

    await expect(
      requestServices.publicEnrollments.requestEnrollment(enrollmentRequest),
    ).resolves.toEqual({ ok: false, error: { kind: "unavailable" } });
  });

  it("retains shared site content while enrollment services remain request-scoped", () => {
    const first = services();
    const second = services();

    expect(first.siteContent).toBe(second.siteContent);
    expect(first.monthlyWorkshops).not.toBe(second.monthlyWorkshops);
  });

  it("fails closed through the unavailable admin enrollment service", async () => {
    await expect(
      services("").enrollments.list(testAdminActor()),
    ).resolves.toEqual({
      ok: false,
      error: { kind: "unavailable" },
    });
  });

  it("preserves per-order outcomes when unavailable bulk materials are requested", async () => {
    await expect(
      services("").enrollments.markMaterialsRequestedBulk(testAdminActor(), [
        "order-1",
        "order-2",
      ]),
    ).resolves.toEqual([
      {
        orderId: "order-1",
        result: { ok: false, error: { kind: "unavailable" } },
      },
      {
        orderId: "order-2",
        result: { ok: false, error: { kind: "unavailable" } },
      },
    ]);
  });
});
