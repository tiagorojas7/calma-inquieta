import { afterEach } from "vitest";
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

afterEach(async () => {
  for (const database of created.splice(0)) {
    await database.drop();
  }
});

runSeatLedgerContract(freshLedger);
