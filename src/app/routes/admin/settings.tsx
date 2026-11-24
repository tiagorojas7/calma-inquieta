import { AdminSettingsHub } from "~/app/ui/admin/settings-hub";
import { requireAdmin } from "./require-admin";
import type { Route } from "./+types/settings";

export function loader({ request, context }: Route.LoaderArgs) {
  requireAdmin(request, context);
  return null;
}

export function meta() {
  return [{ title: "Ajustes | Calma Inquieta" }];
}

export default function AdminSettings() {
  return <AdminSettingsHub />;
}
