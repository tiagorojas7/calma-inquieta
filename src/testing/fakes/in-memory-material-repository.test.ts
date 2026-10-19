import { runMaterialRepositoryContract } from "~/testing/contracts/material-repository.contract";
import { InMemoryMaterialRepository } from "./in-memory-material-repository";

runMaterialRepositoryContract(() => {
  const repository = new InMemoryMaterialRepository();
  return Promise.resolve({
    repository,
    failNextWrite: () => {
      repository.failNextWrite();
    },
  });
});
