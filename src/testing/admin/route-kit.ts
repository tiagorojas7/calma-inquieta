import { RouterContextProvider } from "react-router";
import { servicesContext } from "~/app/context";
import type { AppServices } from "~/composition/request-services";
import { createTeacherLookup, createTeachersService } from "~/modules/teachers";
import { createMonthlyWorkshopsService } from "~/modules/workshops";
import { adminAccessFor, deniedAccess } from "~/testing/fakes/admin-actor";
import { createTestServices } from "~/testing/fakes/app-services";
import { fixedClock } from "~/testing/fakes/fixed-clock";
import { InMemoryMonthlyWorkshopRepository } from "~/testing/fakes/in-memory-monthly-workshop-repository";
import { InMemoryTurnoRepository } from "~/testing/fakes/in-memory-turno-repository";
import { InMemoryTeacherRepository } from "~/testing/fakes/in-memory-teacher-repository";

export const ORIGIN = "https://panel.example.test";

/** Router context carrying test services; `admin: false` makes it a denial. */
export function adminContext(
  overrides: Partial<AppServices> = {},
  options: { admin?: boolean } = {},
) {
  const context = new RouterContextProvider();
  context.set(
    servicesContext,
    createTestServices({
      adminAccess:
        options.admin === false ? deniedAccess() : adminAccessFor("a@x.test"),
      ...overrides,
    }),
  );
  return context;
}

/** Real teachers service over the in-memory repository, ids t1, t2, ... */
export function teachersFixture() {
  const repository = new InMemoryTeacherRepository();
  let next = 0;
  const service = createTeachersService({
    repository,
    clock: fixedClock(new Date("2026-10-05T12:00:00.000Z")),
    newId: () => `t${String(++next)}`,
  });
  return { repository, service };
}

/**
 * Real monthly workshops service over in-memory repositories, ids w1, w2, ...
 * Teachers come from the same fixture as the teachers screens (ids t1, ...).
 * No period uses a turno and no workshop has periods.
 */
export function workshopsFixture() {
  const teachers = teachersFixture();
  const repository = new InMemoryMonthlyWorkshopRepository();
  const turnos = new InMemoryTurnoRepository(repository);
  let next = 0;
  const service = createMonthlyWorkshopsService({
    repository,
    teachers: createTeacherLookup(teachers.repository),
    media: { findAssets: () => Promise.resolve(new Map()) },
    turnos,
    turnoUsage: { isUsed: () => Promise.resolve(false) },
    periods: { hasPeriods: () => Promise.resolve(false) },
    clock: fixedClock(new Date("2026-10-05T12:00:00.000Z")),
    newId: () => `w${String(++next)}`,
  });
  return { teachers, repository, turnos, service };
}

/**
 * A service whose listed methods are replaced and every other call falls
 * through to `base` (typically an unavailable service). Unlike `Object.assign`
 * on an unavailable service, the overrides win over its catch-all trap.
 */
export function withOverrides<T extends object>(
  base: T,
  overrides: Partial<T>,
): T {
  return new Proxy(base, {
    get(target, property, receiver) {
      if (property in overrides) return Reflect.get(overrides, property);
      return Reflect.get(target, property, receiver);
    },
  });
}

export function getRequest(path: string) {
  return new Request(`${ORIGIN}${path}`, { headers: { Origin: ORIGIN } });
}

/** A same-origin form post, as a browser sends it from a native form. */
export function postRequest(
  path: string,
  fields: Record<string, string>,
  headers: Record<string, string> = { Origin: ORIGIN },
) {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(fields),
  });
}

/** The status a loader or action threw as `data(...)`, or null if it did not throw. */
export async function thrownStatus(run: () => unknown): Promise<number | null> {
  try {
    await run();
    return null;
  } catch (thrown) {
    const init =
      typeof thrown === "object" && thrown !== null && "init" in thrown
        ? thrown.init
        : null;
    if (
      typeof init === "object" &&
      init !== null &&
      "status" in init &&
      typeof init.status === "number"
    )
      return init.status;
    throw thrown;
  }
}
