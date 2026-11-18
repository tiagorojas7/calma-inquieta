import { AdminClassesHub } from "~/app/ui/admin/classes-hub";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/classes";

export function loader({ request, context }: Route.LoaderArgs) {
  requireAdmin(request, context);
  return null;
}

export function meta() {
  return [{ title: "Clases | Calma Inquieta" }];
}

export default function AdminClasses() {
  return <AdminClassesHub />;
}
