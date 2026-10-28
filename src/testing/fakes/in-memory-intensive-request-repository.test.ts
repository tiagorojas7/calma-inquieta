import { runIntensiveRequestRepositoryContract } from "~/testing/contracts/intensive-request-repository.contract";
import { InMemoryIntensiveRequestRepository } from "./in-memory-intensive-request-repository";

runIntensiveRequestRepositoryContract(() =>
  Promise.resolve(new InMemoryIntensiveRequestRepository()),
);
