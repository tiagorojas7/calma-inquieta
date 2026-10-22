import { afterAll } from "vitest";
import { createDbSessionFactory } from "~/platform/db/session";
import { runSeatLedgerContract } from "~/testing/contracts/seat-ledger.contract";
import {
  createTestDatabase,
  type TestDatabase,
} from "~/testing/db/test-database";
import { createDrizzleSeatLedger } from "./drizzle-seat-ledger";

const created: TestDatabase[] = [];

async function freshLedger() {
  const database = await createTestDatabase();
  created.push(database);
  return createDrizzleSeatLedger(
    createDbSessionFactory({ connectionString: database.url }),
  );
}

afterAll(async () => {
  await Promise.all(created.map((database) => database.drop()));
});

runSeatLedgerContract(freshLedger);
