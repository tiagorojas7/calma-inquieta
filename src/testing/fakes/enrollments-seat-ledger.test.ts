import { InMemorySeatLedger } from "./enrollments-seat-ledger";
import { runSeatLedgerContract } from "~/testing/contracts/seat-ledger.contract";

runSeatLedgerContract(() => new InMemorySeatLedger());
