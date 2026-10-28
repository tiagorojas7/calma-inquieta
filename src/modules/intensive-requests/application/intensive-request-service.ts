import {
  err,
  ok,
  type Clock,
  type Denied,
  type Invalid,
  type Money,
  type NotFound,
  type Result,
  type Unavailable,
} from "~/modules/_shared";
import { requireAdminActor, type AdminActor } from "~/modules/admin-access";
import {
  generatePublicId,
  isPublicId,
  validateStudentInput,
  type RandomBytes,
  type StudentDraft,
  type StudentField,
} from "~/modules/enrollments";
import { toWhatsAppDigits } from "~/modules/site-content";
import {
  acceptsRequests,
  cordobaDateOf,
  validateCancelReason,
  validateDeposit,
  type DepositField,
  type IntensiveRequestStatus,
} from "../domain/intensive-request-core";
import type {
  IntensiveOffer,
  IntensiveOfferLookup,
} from "./intensive-offer-lookup";
import type {
  DuplicateRequest,
  IllegalTransition,
  IntensiveFull,
  IntensiveRequestRepository,
  StoredIntensiveRequest,
} from "./intensive-request-repository";

const PUBLIC_ID_BYTES = 16;
const REFERENCE_LENGTH = 8;

type MaybeActor = AdminActor | null | undefined;

/** The public offer behind the "Reservar mi lugar" form. */
export interface SeatOffer {
  readonly slug: string;
  readonly name: string;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly deposit: Money;
  readonly minSeats: number;
  readonly policyText: string;
  readonly seatsLeft: number;
}

export type RequestsClosed = { readonly kind: "requests-closed" };
export type SeatsFull = { readonly kind: "seats-full" };
export type OfferError = NotFound | RequestsClosed | SeatsFull | Unavailable;

export type RequestSeatError =
  Invalid<StudentField> | OfferError | DuplicateRequest;

/** Allowlisted projection of a request: no email, phone or internal id. */
export interface PublicRequestView {
  readonly publicId: string;
  /** Short code the owner finds in the panel. */
  readonly reference: string;
  readonly status: IntensiveRequestStatus;
  readonly studentName: string;
  readonly intensivoName: string;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly deposit: Money;
}

export interface AdminIntensiveOverview {
  readonly intensivo: IntensiveOffer;
  readonly confirmedSeats: number;
  /** Oldest first. */
  readonly requests: readonly StoredIntensiveRequest[];
}

export interface ConfirmDepositInput {
  readonly intensiveId: string;
  readonly requestId: string;
  readonly amount: string;
  readonly paidOn: string;
  readonly note: string;
}

export interface CancelRequestInput {
  readonly intensiveId: string;
  readonly requestId: string;
  readonly reason: string;
}

type AdminFailure = Denied | NotFound | Unavailable;
export type ConfirmDepositError =
  AdminFailure | Invalid<DepositField> | IllegalTransition | IntensiveFull;
export type CancelRequestError =
  AdminFailure | Invalid<"reason"> | IllegalTransition;

export interface IntensiveRequestUseCases {
  /** Public: whether the intensivo takes requests and what it asks for. */
  getOffer(slug: string): Promise<Result<SeatOffer, OfferError>>;
  /**
   * Public: records a pending request. A filled honeypot answers like success
   * with a decoy id that was never stored.
   */
  requestSeat(input: {
    readonly slug: string;
    readonly student: StudentDraft;
  }): Promise<Result<{ readonly publicId: string }, RequestSeatError>>;
  getRequestByPublicId(
    publicId: string,
  ): Promise<Result<PublicRequestView, NotFound | Unavailable>>;
  overview(
    actor: MaybeActor,
    intensiveId: string,
  ): Promise<Result<AdminIntensiveOverview, AdminFailure>>;
  confirm(
    actor: MaybeActor,
    input: ConfirmDepositInput,
  ): Promise<Result<StoredIntensiveRequest, ConfirmDepositError>>;
  cancel(
    actor: MaybeActor,
    input: CancelRequestInput,
  ): Promise<Result<StoredIntensiveRequest, CancelRequestError>>;
}

export interface IntensiveRequestServiceDeps {
  readonly repository: IntensiveRequestRepository;
  readonly offers: IntensiveOfferLookup;
  readonly clock: Clock;
  readonly random: RandomBytes;
  readonly newId?: () => string;
}

const phoneDigits = (display: string): string | null => {
  const digits = toWhatsAppDigits(display);
  return digits.ok ? digits.value : null;
};

const unavailable: Unavailable = { kind: "unavailable" };

/** Maps only a rejected dependency promise; programming errors escape. */
async function unavailableOnReject<T>(
  dependency: Promise<T>,
): Promise<Result<T, Unavailable>> {
  try {
    return ok(await dependency);
  } catch {
    return err(unavailable);
  }
}

/** Every use case of the intensivo seat-request flow. */
export function createIntensiveRequestService(
  deps: IntensiveRequestServiceDeps,
): IntensiveRequestUseCases {
  const { repository, offers, clock, random } = deps;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  async function openOffer(
    slug: string,
  ): Promise<Result<{ offer: IntensiveOffer; seatsLeft: number }, OfferError>> {
    const found = await unavailableOnReject(offers.findBySlug(slug));
    if (!found.ok) return found;
    const offer = found.value;
    if (offer === null) return err({ kind: "not-found" });
    if (!acceptsRequests(offer)) {
      // Paused is visible but closed; anything else is not public at all.
      return err(
        offer.status === "paused" && offer.upcoming
          ? { kind: "requests-closed" }
          : { kind: "not-found" },
      );
    }
    const taken = await unavailableOnReject(
      repository.confirmedSeats(offer.id),
    );
    if (!taken.ok) return taken;
    const seatsLeft = Math.max(offer.capacity - taken.value, 0);
    if (seatsLeft === 0) return err({ kind: "seats-full" });
    return ok({ offer, seatsLeft });
  }

  return {
    async getOffer(slug) {
      const open = await openOffer(slug);
      if (!open.ok) return open;
      const { offer, seatsLeft } = open.value;
      return ok({
        slug: offer.slug,
        name: offer.name,
        eventDate: offer.eventDate,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        deposit: offer.deposit,
        minSeats: offer.minSeats,
        policyText: offer.policyText,
        seatsLeft,
      });
    },

    async requestSeat({ slug, student }) {
      const valid = validateStudentInput(student, phoneDigits);
      if (!valid.ok) {
        if (valid.error.kind === "honeypot")
          return ok({
            publicId: generatePublicId(random.bytes(PUBLIC_ID_BYTES)),
          });
        return err(valid.error);
      }
      const open = await openOffer(slug);
      if (!open.ok) return open;
      const now = clock.now();
      const publicId = generatePublicId(random.bytes(PUBLIC_ID_BYTES));
      const inserted = await unavailableOnReject(
        repository.insert({
          id: newId(),
          publicId,
          intensiveId: open.value.offer.id,
          status: "pending_confirmation",
          fullName: valid.value.fullName,
          email: valid.value.email,
          phoneDigits: valid.value.phoneDigits,
          policyAcceptedAt: now,
          createdAt: now,
          paidAmount: null,
          paidOn: null,
          paymentNote: null,
          confirmedBy: null,
          confirmedAt: null,
          cancelReason: null,
          cancelledBy: null,
          cancelledAt: null,
        }),
      );
      if (!inserted.ok) return inserted;
      return inserted.value.ok ? ok({ publicId }) : inserted.value;
    },

    async getRequestByPublicId(publicId) {
      if (!isPublicId(publicId)) return err({ kind: "not-found" });
      const found = await unavailableOnReject(
        repository.findByPublicId(publicId),
      );
      if (!found.ok) return found;
      const request = found.value;
      if (request === null) return err({ kind: "not-found" });
      const offer = await unavailableOnReject(
        offers.findById(request.intensiveId),
      );
      if (!offer.ok) return offer;
      if (offer.value === null) return err({ kind: "not-found" });
      return ok({
        publicId: request.publicId,
        reference: request.publicId.slice(0, REFERENCE_LENGTH),
        status: request.status,
        studentName: request.fullName,
        intensivoName: offer.value.name,
        eventDate: offer.value.eventDate,
        startsAt: offer.value.startsAt,
        endsAt: offer.value.endsAt,
        deposit: offer.value.deposit,
      });
    },

    async overview(actor, intensiveId) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await unavailableOnReject(offers.findById(intensiveId));
      if (!found.ok) return found;
      if (found.value === null) return err({ kind: "not-found" });
      const loaded = await unavailableOnReject(
        Promise.all([
          repository.listByIntensive(intensiveId, "all"),
          repository.confirmedSeats(intensiveId),
        ]),
      );
      if (!loaded.ok) return loaded;
      const [requests, confirmedSeats] = loaded.value;
      return ok({ intensivo: found.value, confirmedSeats, requests });
    },

    async confirm(actor, input) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await unavailableOnReject(
        offers.findById(input.intensiveId),
      );
      if (!found.ok) return found;
      const intensivo = found.value;
      if (intensivo === null) return err({ kind: "not-found" });
      const now = clock.now();
      const deposit = validateDeposit(
        input,
        intensivo.deposit,
        cordobaDateOf(now),
      );
      if (!deposit.ok) return deposit;
      const owned = await ownedRequest(input.intensiveId, input.requestId);
      if (!owned.ok) return owned;
      const confirmed = await unavailableOnReject(
        repository.confirm({
          id: input.requestId,
          capacity: intensivo.capacity,
          amount: intensivo.deposit,
          paidOn: deposit.value.paidOn,
          note: deposit.value.note,
          by: authorized.value.email,
          at: now,
        }),
      );
      return confirmed.ok ? confirmed.value : confirmed;
    },

    async cancel(actor, input) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const reason = validateCancelReason(input.reason);
      if (!reason.ok) return reason;
      const owned = await ownedRequest(input.intensiveId, input.requestId);
      if (!owned.ok) return owned;
      const cancelled = await unavailableOnReject(
        repository.cancel({
          id: input.requestId,
          reason: reason.value,
          by: authorized.value.email,
          at: clock.now(),
        }),
      );
      return cancelled.ok ? cancelled.value : cancelled;
    },
  };

  /** A request is addressed through its intensivo, so a mismatch is not-found. */
  async function ownedRequest(
    intensiveId: string,
    requestId: string,
  ): Promise<Result<StoredIntensiveRequest, NotFound | Unavailable>> {
    const found = await unavailableOnReject(repository.findById(requestId));
    if (!found.ok) return found;
    return found.value !== null && found.value.intensiveId === intensiveId
      ? ok(found.value)
      : err({ kind: "not-found" });
  }
}

/** The service for a deployment without a database: every use case is unavailable. */
export function createUnavailableIntensiveRequestService(): IntensiveRequestUseCases {
  const fail = () => Promise.resolve(err(unavailable));
  const failAdmin = (actor: MaybeActor) => {
    const authorized = requireAdminActor(actor);
    return Promise.resolve(authorized.ok ? err(unavailable) : authorized);
  };
  return {
    getOffer: fail,
    requestSeat: fail,
    getRequestByPublicId: fail,
    overview: failAdmin,
    confirm: failAdmin,
    cancel: failAdmin,
  };
}
