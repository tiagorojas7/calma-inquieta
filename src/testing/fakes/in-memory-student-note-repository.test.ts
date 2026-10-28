import { runStudentNoteRepositoryContract } from "~/testing/contracts/student-note-repository.contract";
import { InMemoryStudentNoteRepository } from "./in-memory-student-note-repository";

runStudentNoteRepositoryContract(() => new InMemoryStudentNoteRepository());
