import { createContext } from "react-router";
import type { AppServices } from "~/composition/request-services";

/**
 * Carries the request-scoped services from the Worker entry to loaders. The
 * default is absent on purpose: reading it without a provider is a defect.
 */
export const servicesContext = createContext<AppServices>();
