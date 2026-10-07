import {
  createRequestHandler,
  RouterContextProvider,
  type ServerBuild,
} from "react-router";
import { servicesContext } from "~/app/context";
import {
  createIsolateState,
  createRequestServices,
} from "~/composition/request-services";
import { formatEnvError, readWorkerEnv } from "~/platform/env";
import { withIndexingHeader } from "~/platform/indexing-header";

// The generated build type declares optional members as `T | undefined`, which
// ServerBuild rejects under exactOptionalPropertyTypes; the shapes are the same.
const handler = createRequestHandler(
  () =>
    import("virtual:react-router/server-build") as unknown as Promise<ServerBuild>,
  import.meta.env.MODE,
);

// Module scope: one per isolate, shared by every request it serves (design D12).
const isolate = createIsolateState();

export default {
  async fetch(request, env, ctx) {
    const parsed = readWorkerEnv(env);
    if (!parsed.ok) {
      // Names only in logs; the body stays generic (RC: Worker failure behavior).
      console.error(formatEnvError(parsed.error));
      return new Response("Service unavailable", { status: 500 });
    }
    const context = new RouterContextProvider();
    context.set(
      servicesContext,
      createRequestServices(
        {
          databaseUrl: parsed.value.HYPERDRIVE.connectionString,
          buildCommit: parsed.value.BUILD_COMMIT,
        },
        {
          defer: (pending) => {
            ctx.waitUntil(pending);
          },
        },
        isolate,
      ),
    );
    return withIndexingHeader(
      await handler(request, context),
      parsed.value.SITE_INDEXING,
    );
  },
} satisfies ExportedHandler<Env>;
