import { useLoaderData } from "react-router";
import { requireAdmin } from "./require-admin";
import { AdminLanding } from "~/app/ui/admin/admin-landing";
import type { Route } from "./+types/home";

export function loader({ request, context }: Route.LoaderArgs) {
  return { email: requireAdmin(request, context).email };
}

export default function AdminHome() {
  const { email } = useLoaderData<typeof loader>();
  return <AdminLanding email={email} />;
}
