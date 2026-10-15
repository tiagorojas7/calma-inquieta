import type { AdminActor } from "~/modules/admin-access";
import type {
  AdminFailure,
  Audit,
  Invalid,
  NotFound,
  Result,
} from "~/modules/_shared";
import type {
  TeacherDraft,
  TeacherField,
  TeacherModality,
} from "../domain/teacher-core";

export type { TeacherDraft, TeacherField, TeacherModality };
export interface Teacher {
  readonly id: string;
  readonly name: string;
  readonly bioLine: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly modality: TeacherModality;
  readonly active: boolean;
  readonly audit: Audit;
}
export interface TeachersService {
  list(
    actor: AdminActor,
    filter: "active" | "archived" | "all",
  ): Promise<Result<readonly Teacher[], AdminFailure>>;
  get(
    actor: AdminActor,
    id: string,
  ): Promise<Result<Teacher, AdminFailure | NotFound>>;
  create(
    actor: AdminActor,
    d: TeacherDraft,
  ): Promise<Result<Teacher, AdminFailure | Invalid<TeacherField>>>;
  update(
    actor: AdminActor,
    id: string,
    d: TeacherDraft,
  ): Promise<Result<Teacher, AdminFailure | NotFound | Invalid<TeacherField>>>;
  archive(
    actor: AdminActor,
    id: string,
  ): Promise<Result<Teacher, AdminFailure | NotFound>>;
  reactivate(
    actor: AdminActor,
    id: string,
  ): Promise<Result<Teacher, AdminFailure | NotFound | Invalid<"name">>>;
}
export interface TeacherLookup {
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, Teacher>>;
}
