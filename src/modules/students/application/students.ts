import type {
  AdminFailure,
  Invalid,
  NotFound,
  Result,
} from "~/modules/_shared";
import type { AdminActor } from "~/modules/admin-access";
import type {
  NoteField,
  StudentProfile,
  StudentQuery,
} from "../domain/student-core";
import type { StudentNote } from "./student-ports";

export type StudentsPage = {
  readonly items: readonly StudentProfile[];
  readonly page: number;
  readonly pageSize: number;
  readonly hasNext: boolean;
};

export type StudentDetail = StudentProfile & {
  readonly note: StudentNote | null;
};

/** The admin contract of the students registry. */
export interface StudentsService {
  list(
    actor: AdminActor,
    query?: StudentQuery,
  ): Promise<Result<StudentsPage, AdminFailure>>;
  detail(
    actor: AdminActor,
    email: string,
  ): Promise<Result<StudentDetail, AdminFailure | NotFound>>;
  saveNote(
    actor: AdminActor,
    email: string,
    text: string,
  ): Promise<Result<StudentNote, AdminFailure | NotFound | Invalid<NoteField>>>;
}
