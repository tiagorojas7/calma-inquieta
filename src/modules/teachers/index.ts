export * from "./application/teachers";
export type { TeacherRepository } from "./application/teacher-repository";
export {
  createTeacherLookup,
  createTeachersService,
} from "./application/teacher-service";
export type {
  TeacherServiceDeps,
  TeacherUseCases,
} from "./application/teacher-service";
