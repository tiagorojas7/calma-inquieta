import { err } from "~/modules/_shared";

export function createUnavailableService<T extends object>(serviceType?: T): T {
  return new Proxy(serviceType ?? {}, {
    get(_target, property) {
      if (property === "then") return undefined;
      return () => Promise.resolve(err({ kind: "unavailable" }));
    },
  }) as T;
}
