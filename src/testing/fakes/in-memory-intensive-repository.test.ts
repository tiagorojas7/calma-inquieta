import { runIntensiveRepositoryContract } from "~/testing/contracts/intensive-repository.contract";
import { InMemoryIntensiveRepository } from "./in-memory-intensive-repository";

runIntensiveRepositoryContract(() =>
  Promise.resolve(new InMemoryIntensiveRepository()),
);
