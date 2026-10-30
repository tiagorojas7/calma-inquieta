import { afterAll, describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { createDbSessionFactory } from "~/platform/db/session";
import { buildStoredRequest } from "~/testing/contracts/intensive-request-repository.contract";
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
    repo: createDrizzleIntensiveRequestRepository(openSession),
    reader: createDrizzleIntensiveRequestInsightsReader(openSession),
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
  it("adds up the seats and payments of the confirmed requests of each intensivo", async () => {
    const { repo, reader } = await setup();
    await repo.insert(confirmed(INTENSIVE_1, 1_500_000));
    await repo.insert(confirmed(INTENSIVE_1, 5_800_000));
    await repo.insert(confirmed(INTENSIVE_2, 2_000_000));
    await repo.insert(request({ intensiveId: INTENSIVE_1 }));

    const rows = await reader.registrations([INTENSIVE_1, INTENSIVE_2]);

    expect(
      [...rows].sort((a, b) => a.intensiveId.localeCompare(b.intensiveId)),
    ).toEqual([
      { intensiveId: INTENSIVE_1, confirmedSeats: 2, paidCentavos: 7_300_000 },
      { intensiveId: INTENSIVE_2, confirmedSeats: 1, paidCentavos: 2_000_000 },
    ]);
    expect(await reader.registrations([])).toEqual([]);
  });

  it("counts the requests still waiting for their deposit", async () => {
    const { repo, reader } = await setup();
    await repo.insert(request({ intensiveId: INTENSIVE_1 }));
    await repo.insert(request({ intensiveId: INTENSIVE_2 }));
    await repo.insert(confirmed(INTENSIVE_1, 1_500_000));

    expect(await reader.pendingRequests()).toBe(2);
  });
});
