import { runMaterialRepositoryContract } from "~/testing/contracts/material-repository.contract";
import { InMemoryMaterialRepository } from "./in-memory-material-repository";

runMaterialRepositoryContract(() =>
  Promise.resolve({ repository: new InMemoryMaterialRepository() }),
);
