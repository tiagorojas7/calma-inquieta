import { data } from "react-router";
import { servicesContext } from "~/app/context";
import type { Route } from "./+types/status";

export async function loader({ context }: Route.LoaderArgs) {
  const result = await context.get(servicesContext).getSystemStatus();
  if (!result.ok) {
    // The use case reports a degraded system as data, so its error type is
    // `never`; this branch only narrows the type.
    return result.error;
  }
  const view = result.value;
  // Project the view field by field: only these values may leave the server.
  const body = {
    status: view.status,
    checks: view.checks.map(({ name, status }) => ({ name, status })),
    latestMigration: view.latestMigration,
    buildCommit: view.buildCommit,
    checkedAt: view.checkedAt,
  };
  return data(body, { status: view.status === "ok" ? 200 : 503 });
}

export function headers() {
  return {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export function meta() {
  return [
    { title: "System status" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function Status({ loaderData }: Route.ComponentProps) {
  return (
    <main data-status={loaderData.status}>
      <h1>System status</h1>
      <p>
        Overall: <strong>{loaderData.status}</strong>
      </p>
      <dl>
        {loaderData.checks.map((check) => (
          <div key={check.name}>
            <dt>{check.name}</dt>
            <dd>{check.status}</dd>
          </div>
        ))}
        <div>
          <dt>latest migration</dt>
          <dd>{loaderData.latestMigration ?? "none"}</dd>
        </div>
        <div>
          <dt>build</dt>
          <dd>{loaderData.buildCommit}</dd>
        </div>
        <div>
          <dt>checked at</dt>
          <dd>{loaderData.checkedAt}</dd>
        </div>
      </dl>
    </main>
  );
}
