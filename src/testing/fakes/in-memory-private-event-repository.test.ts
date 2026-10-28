import { runPrivateEventRepositoryContract } from "~/testing/contracts/private-event-repository.contract";
import { InMemoryPrivateEventRepository } from "./in-memory-private-event-repository";

runPrivateEventRepositoryContract(() =>
  Promise.resolve(new InMemoryPrivateEventRepository()),
);
