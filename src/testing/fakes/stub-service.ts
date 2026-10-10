import { createUnavailableService } from "~/composition/unavailable-service";
export function stubService<T extends object>(overrides: Partial<T> = {}): T {
  return Object.assign(createUnavailableService<T>(), overrides);
}
