import { z } from "zod";
import type { EnvIssue } from "./env";

const TEAM_DOMAIN = /^[a-z0-9-]+\.cloudflareaccess\.com$/;
const AUDIENCE = /^[0-9a-f]{64}$/;
const EMAIL = z.email();

export const adminEnvSchema = z.object({
  ACCESS_TEAM_DOMAIN: z.string().optional(),
  ACCESS_AUD: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  DEV_ADMIN_EMAIL: z.string().optional(),
});

export interface AdminEnvConfig {
  readonly access: {
    readonly teamDomain: string;
    readonly audience: string;
  } | null;
  readonly adminEmails: readonly string[];
  readonly devAdminEmail: string | null;
  readonly issues: readonly EnvIssue[];
}

const cache = new WeakMap<object, AdminEnvConfig>();

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function email(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return EMAIL.safeParse(normalized).success ? normalized : undefined;
}

export function readAdminConfig(env: object): AdminEnvConfig {
  const cached = cache.get(env);
  if (cached) return cached;

  const source = (name: string): unknown => Reflect.get(env, name);
  const issues: EnvIssue[] = [];
  const issueNames = new Set<string>();
  const addInvalidIssue = (name: string) => {
    if (!issueNames.has(name)) {
      issueNames.add(name);
      issues.push({ name, reason: "invalid" });
    }
  };
  const rawDomain = source("ACCESS_TEAM_DOMAIN");
  const rawAudience = source("ACCESS_AUD");
  const domain = nonEmpty(rawDomain);
  const audience = nonEmpty(rawAudience);
  const validDomain = domain !== undefined && TEAM_DOMAIN.test(domain);
  const validAudience = audience !== undefined && AUDIENCE.test(audience);
  if (rawDomain !== undefined && typeof rawDomain !== "string")
    addInvalidIssue("ACCESS_TEAM_DOMAIN");
  else if (domain !== undefined && !validDomain)
    addInvalidIssue("ACCESS_TEAM_DOMAIN");
  if (rawAudience !== undefined && typeof rawAudience !== "string")
    addInvalidIssue("ACCESS_AUD");
  else if (audience !== undefined && !validAudience)
    addInvalidIssue("ACCESS_AUD");

  const emails = new Set<string>();
  const rawEmailsValue = source("ADMIN_EMAILS");
  const rawEmails = nonEmpty(rawEmailsValue);
  if (rawEmailsValue !== undefined && typeof rawEmailsValue !== "string")
    addInvalidIssue("ADMIN_EMAILS");
  else if (rawEmails) {
    for (const entry of rawEmails.split(/[\n,]/)) {
      const valid = email(nonEmpty(entry));
      if (valid) emails.add(valid);
      else addInvalidIssue("ADMIN_EMAILS");
    }
  }

  const rawDevValue = source("DEV_ADMIN_EMAIL");
  const rawDev = nonEmpty(rawDevValue);
  const devAdminEmail = email(rawDev);
  if (rawDevValue !== undefined && typeof rawDevValue !== "string")
    addInvalidIssue("DEV_ADMIN_EMAIL");
  else if (rawDev !== undefined && !devAdminEmail)
    addInvalidIssue("DEV_ADMIN_EMAIL");

  const config: AdminEnvConfig = {
    access:
      validDomain && validAudience ? { teamDomain: domain, audience } : null,
    adminEmails: [...emails],
    devAdminEmail: devAdminEmail ?? null,
    issues,
  };
  cache.set(env, config);
  return config;
}
