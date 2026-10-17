import { runMonthlyWorkshopRepositoryContract } from "~/testing/contracts/monthly-workshop-repository.contract";
import { InMemoryMonthlyWorkshopRepository } from "./in-memory-monthly-workshop-repository";

runMonthlyWorkshopRepositoryContract(() =>
  Promise.resolve(new InMemoryMonthlyWorkshopRepository()),
);
