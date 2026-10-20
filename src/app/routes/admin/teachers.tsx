import { useLoaderData } from "react-router";
import { servicesContext } from "~/app/context";
import { failureResponse } from "~/app/admin/failure-response";
import {
  parseTeacherFilter,
  parseTeacherFilterKey,
} from "~/app/admin/teacher-form-data";
import { TeachersList } from "~/app/ui/admin/teachers-list";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/teachers";

export function meta() {
  return [{ title: "Profesores | Panel | Calma Inquieta" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const actor = requireAdmin(request, context);
  const estado = new URL(request.url).searchParams.get("estado");
  const listed = await context
    .get(servicesContext)
    .teachers.list(actor, parseTeacherFilter(estado));
  if (!listed.ok) throw failureResponse(listed.error);
  return {
    filter: parseTeacherFilterKey(estado),
    rows: listed.value.map((teacher) => ({
      id: teacher.id,
      name: teacher.name,
      modality: teacher.modality,
      active: teacher.active,
    })),
  };
}

export default function AdminTeachers() {
  const { filter, rows } = useLoaderData<typeof loader>();
  return <TeachersList rows={rows} filter={filter} />;
}
