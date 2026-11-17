import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createDbSessionFactory } from "~/platform/db/session";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
import { createTestOrderStock } from "~/testing/db/order-stock";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleIntensiveRequestInsightsReader } from "./drizzle-intensive-request-insights-reader";
import { createDrizzleIntensiveRequestRepository } from "./drizzle-intensive-request-repository";

const created: TestDatabase[] = [];
afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

const INTENSIVE_1 = "33333333-3333-4333-8333-000000000001";
const INTENSIVE_2 = "33333333-3333-4333-8333-000000000002";
const INTENSIVE_3 = "33333333-3333-4333-8333-000000000003";

function pesos(centavos: number) {
  const money = Money.fromCentavos(centavos);
  if (!money.ok) throw new Error("invalid amount");
  return money.value;
}

async function setup() {
  const database = await createTestDatabase();
  created.push(database);
  const openSession = createDbSessionFactory({
    connectionString: database.url,
  });
  return {
    /** A workshop row, as the panel reads its name and deposit terms. */
    workshop: async (id: string, name: string, depositCentavos: number) => {
      const session = await openSession();
      try {
        await session.db.execute(
          sql`INSERT INTO intensive_workshop
              (id, slug, name, summary, description, event_date, starts_at,
               ends_at, price_centavos, deposit_centavos, capacity, min_seats,
               policy_text, materials_included, status, updated_by, updated_at)
              VALUES (${id}, ${"slug-" + id.slice(-4)}, ${name}, 's', 'd',
                      '2026-12-05', '10:00', '14:00', 4000000, ${depositCentavos},
                      10, 1, 'p', true, 'published', 'owner@example.com', now())`,
        );
      } finally {
        await session.close();
      }
    },
    repo: createDrizzleIntensiveRequestRepository(
      openSession,
      createTestOrderStock(openSession).port,
    ),
    reader: createDrizzleIntensiveRequestInsightsReader(openSession),
    openSession,
    /** Writes an allocated line straight in, as the confirm step would. */
    allocate: async (
      requestId: string,
      position: number,
      quantity: number,
      unitCostCentavos: number | null,
      source: "stock" | "supplier" = "stock",
    ) => {
      const session = await openSession();
      try {
        await session.db.execute(
          sql`INSERT INTO intensive_request_material
              (request_id, position, variant_id, material_name, variant_label,
               supplier_id, supplier_name, quantity, unit_cost_centavos, source)
              VALUES (${requestId}, ${position}, ${"5c000000-0000-4000-8000-000000000001"},
                      'Arcilla', '1 kg', ${"5a000000-0000-4000-8000-000000000001"},
                      'Ceramica Sur', ${quantity}, ${unitCostCentavos}, ${source})`,
        );
      } finally {
        await session.close();
      }
    },
  };
}

let counter = 0;
function request(overrides: Parameters<typeof buildStoredRequest>[0]) {
  counter += 1;
  const n = String(counter).padStart(12, "0");
  return buildStoredRequest({
    id: `44444444-4444-4444-8444-${n}`,
    publicId: `public-id-${n}-abcdefgh`,
    email: `alumna${String(counter)}@example.com`,
    ...overrides,
  });
}

const confirmed = (intensiveId: string, centavos: number) =>
  request({
    intensiveId,
    status: "confirmed",
    paidAmount: pesos(centavos),
    paidOn: "2026-10-20",
    confirmedBy: "owner@example.com",
    confirmedAt: new Date("2026-10-20T15:00:00.000Z"),
  });

describe("createDrizzleIntensiveRequestInsightsReader", () => {
  const quoted = (intensiveId: string, price: number, deposit: number) =>
    request({
      intensiveId,
      status: "confirmed",
      paidAmount: pesos(deposit),
      paidOn: "2026-10-20",
      confirmedBy: "owner@example.com",
      confirmedAt: new Date("2026-10-20T15:00:00.000Z"),
      price: pesos(price),
      deposit: pesos(deposit),
    });

  const balanceOf = (amount: number) => ({
    amount: pesos(amount),
    paidOn: "2026-10-25",
    note: null,
    by: "owner@example.com",
    at: new Date("2026-10-25T15:00:00.000Z"),
  });

  it("settles only the confirmed requests paid in full, on the total they received", async () => {
    const { repo, reader, allocate } = await setup();
    // Deposit 15.000 plus balance 25.000 of a 40.000 price.
    const withBalance = {
      ...quoted(INTENSIVE_1, 4_000_000, 1_500_000),
      balance: balanceOf(2_500_000),
    };
    // The deposit was the whole 30.000 price: nothing is left to collect.
    const depositOnly = quoted(INTENSIVE_1, 3_000_000, 3_000_000);
    // Deposit paid, balance still due: seat taken, nothing settled yet.
    const owing = quoted(INTENSIVE_1, 4_000_000, 1_500_000);
    // Paid in full and then cancelled: out of the settlement.
    const cancelled = {
      ...quoted(INTENSIVE_1, 4_000_000, 1_500_000),
      status: "cancelled" as const,
      balance: balanceOf(2_500_000),
      cancelReason: "no puede asistir",
      cancelledBy: "owner@example.com",
      cancelledAt: new Date("2026-10-26T15:00:00.000Z"),
      refund: { amount: pesos(0), refundedOn: "2026-10-26", note: null },
    };
    const pending = request({ intensiveId: INTENSIVE_1 });
    for (const stored of [withBalance, depositOnly, owing, cancelled, pending])
      await repo.insert(stored);
    await allocate(withBalance.id, 0, 2, 300_000);
    await allocate(withBalance.id, 1, 1, null, "supplier");
    await allocate(depositOnly.id, 0, 1, 80_000);
    await allocate(owing.id, 0, 5, 100_000);
    await allocate(cancelled.id, 0, 3, 700_000);

    const rows = await reader.registrations([INTENSIVE_1]);

    expect(rows).toEqual([
      {
        intensiveId: INTENSIVE_1,
        confirmedSeats: 3,
        // Collected also shows the deposit of the request still owing.
        collectedCentavos: 4_000_000 + 3_000_000 + 1_500_000,
        settledCentavos: 4_000_000 + 3_000_000,
        materialsCostCentavos: 2 * 300_000 + 80_000,
      },
    ]);
    expect(await reader.registrations([])).toEqual([]);
  });

  it("keeps an intensivo with seats but nothing paid in full at zero, and never mixes intensivos", async () => {
    const { repo, reader, allocate } = await setup();
    const owing = quoted(INTENSIVE_1, 4_000_000, 1_500_000);
    const paid = quoted(INTENSIVE_2, 2_000_000, 2_000_000);
    await repo.insert(owing);
    await repo.insert(paid);
    await allocate(owing.id, 0, 1, 100_000);
    await allocate(paid.id, 0, 4, 50_000);

    const rows = await reader.registrations([INTENSIVE_1, INTENSIVE_2]);

    expect(
      [...rows].sort((a, b) => a.intensiveId.localeCompare(b.intensiveId)),
    ).toEqual([
      {
        intensiveId: INTENSIVE_1,
        confirmedSeats: 1,
        collectedCentavos: 1_500_000,
        settledCentavos: 0,
        materialsCostCentavos: 0,
      },
      {
        intensiveId: INTENSIVE_2,
        confirmedSeats: 1,
        collectedCentavos: 2_000_000,
        settledCentavos: 2_000_000,
        materialsCostCentavos: 200_000,
      },
    ]);
  });

  it("counts the requests still waiting for their deposit", async () => {
    const { repo, reader } = await setup();
    await repo.insert(request({ intensiveId: INTENSIVE_1 }));
    await repo.insert(request({ intensiveId: INTENSIVE_2 }));
    await repo.insert(confirmed(INTENSIVE_1, 1_500_000));

    expect(await reader.pendingRequests()).toBe(2);
  });
});

describe("the bell readers", () => {
  const opened = {
    by: "owner@example.com",
    at: new Date("2026-10-27T15:00:00Z"),
  };
  const quoted = (intensiveId: string, price: number, deposit: number) =>
    request({
      intensiveId,
      status: "confirmed",
      paidAmount: pesos(deposit),
      paidOn: "2026-10-20",
      confirmedBy: "owner@example.com",
      confirmedAt: new Date("2026-10-20T15:00:00.000Z"),
      price: pesos(price),
      deposit: pesos(deposit),
    });
  const balanceOf = (amount: number) => ({
    amount: pesos(amount),
    paidOn: "2026-10-25",
    note: null,
    by: "owner@example.com",
    at: new Date("2026-10-25T15:00:00.000Z"),
  });

  it("lists the unopened requests that are not cancelled, newest first, with the workshop name", async () => {
    const { repo, reader, workshop } = await setup();
    await workshop(INTENSIVE_1, "Taller de torno", 1_500_000);
    const older = request({
      intensiveId: INTENSIVE_1,
      fullName: "Older",
      createdAt: new Date("2026-10-20T12:00:00Z"),
    });
    const newer = request({
      intensiveId: INTENSIVE_2,
      fullName: "Newer",
      createdAt: new Date("2026-10-22T12:00:00Z"),
    });
    const read = request({ intensiveId: INTENSIVE_3, fullName: "Read" });
    const cancelled = {
      ...request({ intensiveId: INTENSIVE_1, fullName: "Cancelled" }),
      status: "cancelled" as const,
      cancelReason: "no puede asistir",
      cancelledBy: "owner@example.com",
      cancelledAt: new Date("2026-10-26T15:00:00.000Z"),
    };
    for (const stored of [older, newer, read, cancelled])
      await repo.insert(stored);
    await repo.markSeenForIntensive(INTENSIVE_3, opened);

    expect(await reader.unseenRequests()).toEqual([
      {
        id: newer.id,
        intensiveId: INTENSIVE_2,
        workshopName: null,
        fullName: "Newer",
        createdAt: newer.createdAt,
      },
      {
        id: older.id,
        intensiveId: INTENSIVE_1,
        workshopName: "Taller de torno",
        fullName: "Older",
        createdAt: older.createdAt,
      },
    ]);
  });

  it("lists the deposit of every pending request and the balance of every confirmed one that still owes it, oldest first", async () => {
    const { repo, reader, workshop } = await setup();
    await workshop(INTENSIVE_1, "Taller de torno", 1_500_000);
    // Quoted when requested: its own deposit counts, not the workshop's.
    const quotedPending = request({
      intensiveId: INTENSIVE_1,
      fullName: "Quoted",
      createdAt: new Date("2026-10-21T12:00:00Z"),
      price: pesos(3_000_000),
      deposit: pesos(1_000_000),
    });
    // Made before projects existed: the workshop's deposit stands in.
    const legacyPending = request({
      intensiveId: INTENSIVE_1,
      fullName: "Legacy",
      createdAt: new Date("2026-10-22T12:00:00Z"),
    });
    const owingBalance = {
      ...quoted(INTENSIVE_1, 4_000_000, 1_500_000),
      fullName: "Owing",
      createdAt: new Date("2026-10-20T12:00:00Z"),
    };
    const paidBalance = {
      ...quoted(INTENSIVE_1, 4_000_000, 1_500_000),
      balance: balanceOf(2_500_000),
    };
    const depositWasAll = quoted(INTENSIVE_1, 3_000_000, 3_000_000);
    const cancelled = {
      ...request({ intensiveId: INTENSIVE_1 }),
      status: "cancelled" as const,
      cancelReason: "no puede asistir",
      cancelledBy: "owner@example.com",
      cancelledAt: new Date("2026-10-26T15:00:00.000Z"),
    };
    for (const stored of [
      quotedPending,
      legacyPending,
      owingBalance,
      paidBalance,
      depositWasAll,
      cancelled,
    ])
      await repo.insert(stored);

    expect(await reader.pendingPayments()).toEqual([
      {
        id: owingBalance.id,
        intensiveId: INTENSIVE_1,
        workshopName: "Taller de torno",
        fullName: "Owing",
        kind: "balance",
        amountCentavos: 2_500_000,
        createdAt: owingBalance.createdAt,
      },
      {
        id: quotedPending.id,
        intensiveId: INTENSIVE_1,
        workshopName: "Taller de torno",
        fullName: "Quoted",
        kind: "deposit",
        amountCentavos: 1_000_000,
        createdAt: quotedPending.createdAt,
      },
      {
        id: legacyPending.id,
        intensiveId: INTENSIVE_1,
        workshopName: "Taller de torno",
        fullName: "Legacy",
        kind: "deposit",
        amountCentavos: 1_500_000,
        createdAt: legacyPending.createdAt,
      },
    ]);
  });

  it("marks only the opened workshop and rejects a half-set mark at the database", async () => {
    const { repo, openSession } = await setup();
    const first = request({ intensiveId: INTENSIVE_1 });
    const other = request({ intensiveId: INTENSIVE_2 });
    await repo.insert(first);
    await repo.insert(other);

    expect(await repo.markSeenForIntensive(INTENSIVE_1, opened)).toBe(1);
    expect(
      await repo.markSeenForIntensive(INTENSIVE_1, { ...opened, by: "x@y.z" }),
    ).toBe(0);

    const session = await openSession();
    try {
      const { rows } = await session.db.execute<{
        id: string;
        seen_by: string | null;
      }>(sql`SELECT id, seen_by FROM intensive_seat_request ORDER BY id`);
      expect(rows.find((row) => row.id === first.id)?.seen_by).toBe(opened.by);
      expect(rows.find((row) => row.id === other.id)?.seen_by).toBeNull();
      await expect(
        session.db.execute(
          sql`UPDATE intensive_seat_request SET seen_by = 'someone'
              WHERE id = ${other.id}`,
        ),
      ).rejects.toThrow();
    } finally {
      await session.close();
    }
  });
});
