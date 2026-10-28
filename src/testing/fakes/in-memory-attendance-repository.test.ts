import { runAttendanceRepositoryContract } from "~/testing/contracts/attendance-repository.contract";
import { InMemoryAttendanceRepository } from "./in-memory-attendance-repository";

runAttendanceRepositoryContract(() =>
  Promise.resolve(new InMemoryAttendanceRepository()),
);
