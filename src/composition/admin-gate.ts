import { systemClock } from "~/platform/system-clock";
import type { AdminEnvConfig } from "~/platform/admin-env";
import {
  createAuthorizeAdminRequest,
  isSameOriginMutation,
  type AdminAccessState,
} from "~/modules/admin-access";
import {
  createWebCryptoAccessVerifier,
  type AccessKeyCacheCell,
} from "~/modules/admin-access/infrastructure/access-verifier";

export const ADMIN_DENIED_PATH = "/sin-acceso";

function normalizedPath(url: URL): string | null {
  try {
    return decodeURIComponent(url.pathname)
      .replace(/\/{2,}/g, "/")
      .toLowerCase();
  } catch {
    return null;
  }
}

export function isAdminPath(url: URL): boolean {
  return normalizedPath(url)?.startsWith("/admin") ?? true;
}

export type AdminGateResult =
  | { readonly kind: "not-admin" }
  | { readonly kind: "allowed"; readonly adminAccess: AdminAccessState }
  | {
      readonly kind: "denied";
      readonly mode: "document" | "plain";
      readonly adminAccess: AdminAccessState;
    };

export async function runAdminGate(
  request: Request,
  config: AdminEnvConfig,
  isolate: { readonly accessKeys: AccessKeyCacheCell },
): Promise<AdminGateResult> {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return { kind: "not-admin" };
  }
  const pathname = normalizedPath(url);
  if (pathname !== null && !pathname.startsWith("/admin"))
    return { kind: "not-admin" };
  const sameOrigin = isSameOriginMutation({
    method: request.method,
    url: request.url,
    origin: request.headers.get("Origin"),
    secFetchSite: request.headers.get("Sec-Fetch-Site"),
  });
  const dataRequest = pathname?.endsWith(".data") ?? false;
  const plain =
    !sameOrigin ||
    dataRequest ||
    !["GET", "HEAD"].includes(request.method.toUpperCase());
  if (!sameOrigin) {
    console.warn("admin access denied: cross-origin");
    return {
      kind: "denied",
      mode: "plain",
      adminAccess: { kind: "denied", identityEmail: null },
    };
  }
  if (dataRequest) {
    console.warn("admin access denied: data request");
    return {
      kind: "denied",
      mode: "plain",
      adminAccess: { kind: "denied", identityEmail: null },
    };
  }
  const decision = await createAuthorizeAdminRequest({
    config: {
      access: config.access,
      adminEmails: config.adminEmails,
      devAdminEmail: config.devAdminEmail,
      hasIssues: config.issues.length > 0,
    },
    signatures: config.access
      ? createWebCryptoAccessVerifier({
          teamDomain: config.access.teamDomain,
          fetch,
          clock: systemClock,
          cell: isolate.accessKeys,
        })
      : { verify: () => Promise.resolve("invalid" as const) },
    clock: systemClock,
  })({ assertion: request.headers.get("Cf-Access-Jwt-Assertion") });
  if (decision.kind === "admin")
    return {
      kind: "allowed",
      adminAccess: { kind: "admin", actor: decision.actor },
    };
  if (decision.reason === "config-invalid" && config.issues.length === 0)
    console.warn("admin access unexpected error");
  else console.warn(`admin access denied: ${decision.reason}`);
  if (config.issues.length)
    console.warn(
      `admin config invalid: ${config.issues.map((issue) => issue.name).join(", ")}`,
    );
  return {
    kind: "denied",
    mode: plain ? "plain" : "document",
    adminAccess: { kind: "denied", identityEmail: decision.identityEmail },
  };
}
