import {
  createRequestHandler,
  RouterContextProvider,
  type ServerBuild,
} from "react-router";
import { servicesContext } from "~/app/context";
import {
  createIsolateState,
  createRequestServices,
  type AppServices,
  type IsolateState,
} from "~/composition/request-services";
import {
  ADMIN_DENIED_PATH,
  isAdminPath,
  runAdminGate,
} from "~/composition/admin-gate";
import type { ReminderRunSummary } from "~/modules/notifications";
import { readAdminConfig } from "~/platform/admin-env";
import { withAdminHeaders } from "~/platform/admin-headers";
import { readMediaBinding } from "~/platform/r2";
import { formatEnvError, readWorkerEnv } from "~/platform/env";
import {
  unavailableResponse,
  withIndexingHeader,
} from "~/platform/indexing-header";

export interface WorkerContext {
  waitUntil(pending: Promise<unknown>): void;
}

export type RouterHandler = (
  request: Request,
  context: RouterContextProvider,
) => Promise<Response>;

const isolatesWithUnavailableMedia = new WeakSet<IsolateState>();

function warnUnavailableMediaOnce(isolate: IsolateState): void {
  if (isolatesWithUnavailableMedia.has(isolate)) return;

  isolatesWithUnavailableMedia.add(isolate);
  console.warn("MEDIA binding is unavailable.");
}

function plainDeniedResponse(): Response {
  return new Response("No tenés acceso al panel.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function withoutBodyForHead(request: Request, response: Response): Response {
  if (request.method !== "HEAD") return response;

  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function requestUrl(request: Request): URL | null {
  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}

function isHttpLocalhostRequest(request: Request): boolean {
  const url = requestUrl(request);
  return url?.protocol === "http:" && url.hostname === "localhost";
}

function createServices(
  config: Parameters<typeof createRequestServices>[0],
  runtime: WorkerContext,
  isolate: IsolateState,
  adminAccess: AppServices["adminAccess"],
): AppServices {
  return {
    ...createRequestServices(
      config,
      {
        defer: (pending) => {
          runtime.waitUntil(pending);
        },
      },
      isolate,
    ),
    adminAccess,
  };
}

/**
 * The daily cron: sends the class and pending-fee reminders. It reads the
 * database only when automatic email is configured, so it is inert until launch.
 * Resolves with the counts, or null when email is off or the environment is invalid.
 */
export async function handleScheduled(
  env: object,
  runtime: WorkerContext,
  isolate: IsolateState,
  mode: string,
): Promise<ReminderRunSummary | null> {
  const parsed = readWorkerEnv(env, { mode });
  if (!parsed.ok) {
    console.error(formatEnvError(parsed.error));
    return null;
  }
  const { RESEND_API_KEY: apiKey, EMAIL_FROM: from } = parsed.value;
  if (apiKey === undefined || from === undefined) return null;

  const services = createRequestServices(
    {
      databaseUrl: parsed.value.HYPERDRIVE.connectionString,
      buildCommit: parsed.value.BUILD_COMMIT,
      siteUrl: parsed.value.SITE_URL,
      indexingEnabled: parsed.value.SITE_INDEXING,
      mediaBucket: null,
      email: { apiKey, from },
    },
    {
      defer: (pending) => {
        runtime.waitUntil(pending);
      },
    },
    isolate,
  );
  const summary = await services.notifications.runDailyReminders();
  console.log(
    `Daily email reminders: classes=${String(summary.classes)} fees=${String(summary.fees)} failed=${String(summary.failed)}`,
  );
  return summary;
}

export async function handleRequest(
  request: Request,
  env: object,
  runtime: WorkerContext,
  isolate: IsolateState,
  handler: RouterHandler,
  mode: string,
): Promise<Response> {
  const parsed = readWorkerEnv(env, { mode });
  if (!parsed.ok) {
    console.error(formatEnvError(parsed.error));
    return unavailableResponse();
  }

  const mediaBucket = readMediaBinding(env);
  if (mediaBucket === null) warnUnavailableMediaOnce(isolate);

  const runtimeConfig = {
    databaseUrl: parsed.value.HYPERDRIVE.connectionString,
    buildCommit: parsed.value.BUILD_COMMIT,
    siteUrl: parsed.value.SITE_URL,
    indexingEnabled: parsed.value.SITE_INDEXING,
    mediaBucket,
    email:
      parsed.value.RESEND_API_KEY !== undefined &&
      parsed.value.EMAIL_FROM !== undefined
        ? { apiKey: parsed.value.RESEND_API_KEY, from: parsed.value.EMAIL_FROM }
        : null,
  };
  const url = requestUrl(request);
  if (!url) return unavailableResponse();
  const admin = isAdminPath(url);
  const adminConfig = readAdminConfig(env);
  const gate = admin
    ? await runAdminGate(
        request,
        isHttpLocalhostRequest(request)
          ? adminConfig
          : { ...adminConfig, devAdminEmail: null },
        isolate,
      )
    : { kind: "not-admin" as const };

  if (gate.kind === "denied" && gate.mode === "plain") {
    return withoutBodyForHead(request, withAdminHeaders(plainDeniedResponse()));
  }

  const context = new RouterContextProvider();
  const adminAccess =
    gate.kind === "not-admin"
      ? { kind: "not-evaluated" as const }
      : gate.adminAccess;
  context.set(
    servicesContext,
    createServices(runtimeConfig, runtime, isolate, adminAccess),
  );
  const routedRequest =
    gate.kind === "denied"
      ? new Request(new URL(ADMIN_DENIED_PATH, request.url), {
          method: "GET",
          headers: request.headers,
        })
      : request;
  const response = await handler(routedRequest, context);
  const secured = admin
    ? withAdminHeaders(
        gate.kind === "denied"
          ? new Response(response.body, {
              status: 403,
              statusText: response.statusText,
              headers: response.headers,
            })
          : response,
      )
    : response;
  return withoutBodyForHead(
    request,
    withIndexingHeader(secured, parsed.value.SITE_INDEXING),
  );
}

// SAFETY: The generated build type declares optional members as `T | undefined`,
// which ServerBuild rejects under exactOptionalPropertyTypes; the shapes are the
// same.
const handler = createRequestHandler(
  () =>
    import("virtual:react-router/server-build") as unknown as Promise<ServerBuild>,
  import.meta.env.MODE,
);

// Module scope: one per isolate, shared by every request it serves (design D12).
const isolate = createIsolateState();

export default {
  fetch(request, env, ctx) {
    return handleRequest(
      request,
      env,
      ctx,
      isolate,
      handler,
      import.meta.env.MODE,
    );
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      handleScheduled(env, ctx, isolate, import.meta.env.MODE).then(
        () => undefined,
        () => {
          console.error("Daily email reminders failed.");
        },
      ),
    );
  },
} satisfies ExportedHandler<Env>;
