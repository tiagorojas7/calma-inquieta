import type { Clock, Money } from "~/modules/_shared";
import type { MediaAsset, MediaLookup } from "~/modules/media";
import { startsInFuture } from "../domain/intensive-core";
import type {
  IntensiveRepository,
  StoredIntensiveProject,
} from "./intensive-repository";
import type { PublicImage } from "./public-catalog";
import { projectImages } from "./public-projection";

/** A selectable project: its terms and its cover, resolved for the public. */
export interface IntensiveSeatOfferProject {
  readonly id: string;
  readonly name: string;
  readonly image: PublicImage | null;
  readonly price: Money;
  readonly deposit: Money;
}

/**
 * An intensivo as the seat-request flow sees it, whatever its status: the
 * terms it asks for, and whether its start is still ahead. No audit, teacher
 * or gallery data travels here.
 */
export interface IntensiveSeatOffer {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: string;
  readonly upcoming: boolean;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly price: Money;
  readonly deposit: Money;
  readonly capacity: number;
  readonly minSeats: number;
  readonly policyText: string;
  /** In admin order; they share the schedule and the capacity. */
  readonly projects: readonly IntensiveSeatOfferProject[];
}

export interface IntensiveSeatOfferLookup {
  findBySlug(slug: string): Promise<IntensiveSeatOffer | null>;
  findById(id: string): Promise<IntensiveSeatOffer | null>;
}

export interface IntensiveSeatOfferLookupDeps {
  readonly repository: Pick<
    IntensiveRepository,
    "findBySlug" | "findById" | "listProjects"
  >;
  readonly media: MediaLookup;
  readonly clock: Clock;
}

/**
 * Actorless read for the seat-request flow. It reports the stored status and
 * lets the consumer decide what is public; administrative services stay
 * actor-first and are not reused at this boundary.
 */
export function createIntensiveSeatOfferLookup(
  deps: IntensiveSeatOfferLookupDeps,
): IntensiveSeatOfferLookup {
  async function projectsOf(
    intensiveId: string,
  ): Promise<readonly IntensiveSeatOfferProject[]> {
    const stored = await deps.repository.listProjects(intensiveId);
    const refs = stored.flatMap((project) =>
      project.image === null ? [] : [project.image],
    );
    const assets: ReadonlyMap<string, MediaAsset> =
      refs.length === 0
        ? new Map()
        : await deps.media.findAssets([
            ...new Set(refs.map((ref) => ref.assetId)),
          ]);
    return stored.map((project: StoredIntensiveProject) => ({
      id: project.id,
      name: project.name,
      image:
        project.image === null
          ? null
          : (projectImages([project.image], assets)[0] ?? null),
      price: project.price,
      deposit: project.deposit,
    }));
  }

  const project = async (
    stored: Awaited<ReturnType<IntensiveRepository["findById"]>>,
  ): Promise<IntensiveSeatOffer | null> =>
    stored === null
      ? null
      : {
          id: stored.id,
          slug: stored.slug,
          name: stored.name,
          status: stored.status,
          upcoming: startsInFuture(
            {
              eventDate: stored.eventDate,
              startsAt: stored.startsAt,
              endsAt: stored.endsAt,
            },
            deps.clock.now(),
          ),
          eventDate: stored.eventDate,
          startsAt: stored.startsAt,
          endsAt: stored.endsAt,
          price: stored.price,
          deposit: stored.deposit,
          capacity: stored.capacity,
          minSeats: stored.minSeats,
          policyText: stored.policyText,
          projects: await projectsOf(stored.id),
        };
  return {
    findBySlug: async (slug) => project(await deps.repository.findBySlug(slug)),
    findById: async (id) => project(await deps.repository.findById(id)),
  };
}
