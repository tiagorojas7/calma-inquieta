import { runTeacherRepositoryContract } from "~/testing/contracts/teacher-repository.contract";
import { InMemoryTeacherRepository } from "./in-memory-teacher-repository";

runTeacherRepositoryContract(() =>
  Promise.resolve(new InMemoryTeacherRepository()),
);
