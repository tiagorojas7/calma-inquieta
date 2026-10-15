import { runSupplierRepositoryContract } from "~/testing/contracts/supplier-repository.contract";
import { InMemorySupplierRepository } from "./in-memory-supplier-repository";

runSupplierRepositoryContract(() =>
  Promise.resolve(new InMemorySupplierRepository()),
);
