import { Money } from "~/modules/_shared";
import {
  createIntensiveRequestService,
  type IntensiveOffer,
} from "~/modules/intensive-requests";
import { fixedClock } from "./fixed-clock";
import { InMemoryIntensiveRequestRepository } from "./in-memory-intensive-request-repository";

export const FAKE_INTENSIVE_ID = "0b6f7a3e-1c1e-4a39-9d57-0d1d7c1f0a01";
export const FAKE_INTENSIVE_SLUG = "intensivo-de-ceramica";

const pesos = (amount: number): Money => {
  const money = Money.fromCentavos(amount * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
};

/** A published, upcoming intensivo that asks for a 15.000 deposit. */
export function buildIntensiveOffer(
  overrides: Partial<IntensiveOffer> = {},
): IntensiveOffer {
  return {
    id: FAKE_INTENSIVE_ID,
    slug: FAKE_INTENSIVE_SLUG,
    name: "Intensivo de cerámica",
    status: "published",
    upcoming: true,
    eventDate: "2026-11-14",
    startsAt: "10:00",
    endsAt: "14:00",
    price: pesos(40000),
    deposit: pesos(15000),
    capacity: 2,
    minSeats: 4,
    policyText: "Si no llegamos al mínimo, devolvemos la seña.",
    ...overrides,
  };
}

/** The real seat-request service over an in-memory repository and one intensivo. */
export function createInMemoryIntensiveRequests(
  options: { offer?: IntensiveOffer | null; now?: Date } = {},
) {
  const offer =
    options.offer === undefined ? buildIntensiveOffer() : options.offer;
  const repository = new InMemoryIntensiveRequestRepository();
  let counter = 0;
  const service = createIntensiveRequestService({
    repository,
    offers: {
      findBySlug: (slug) =>
        Promise.resolve(offer?.slug === slug ? offer : null),
      findById: (id) => Promise.resolve(offer?.id === id ? offer : null),
    },
    clock: fixedClock(options.now ?? new Date("2026-10-28T15:00:00.000Z")),
    random: {
      bytes: (length) =>
        Uint8Array.from({ length }, (_, i) => (i * 7 + 3) % 256),
    },
    newId: () =>
      `00000000-0000-4000-8000-${String((counter += 1)).padStart(12, "0")}`,
  });
  return { service, repository };
}
