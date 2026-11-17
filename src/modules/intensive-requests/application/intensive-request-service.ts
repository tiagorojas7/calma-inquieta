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
  balanceDue,
  cordobaDateOf,
  parseRefund,
  validateBalance,
  validateCancelReason,
  validateDeposit,
  type DepositField,
  type IntensiveRequestStatus,
  type InvalidRequestRefund,
  type RefundDraft,
} from "../domain/intensive-request-core";
import type {
  IntensiveOffer,
  IntensiveOfferLookup,
  IntensiveOfferProject,
} from "./intensive-offer-lookup";
import type {
  BalanceAlreadyPaid,
  DuplicateRequest,
  IllegalTransition,
  IntensiveFull,
  IntensiveRequestRepository,
  StoredIntensiveRequest,
} from "./intensive-request-repository";

const PUBLIC_ID_BYTES = 16;
const REFERENCE_LENGTH = 8;

type MaybeActor = AdminActor | null | undefined;

/** A project the visitor can choose: name, cover, total price and deposit. */
export type SeatProject = IntensiveOfferProject;

/** The public offer behind the "Reservar mi lugar" form. */
export interface SeatOffer {
  readonly slug: string;
  readonly name: string;
  readonly eventDate: string;
  readonly startsAt: string;
  readonly endsAt: string;
  /** In admin order; one is chosen with the request. */
  readonly projects: readonly SeatProject[];
  readonly minSeats: number;
  readonly policyText: string;
  readonly seatsLeft: number;
}

export type RequestsClosed = { readonly kind: "requests-closed" };
export type SeatsFull = { readonly kind: "seats-full" };
export type OfferError = NotFound | RequestsClosed | SeatsFull | Unavailable;

export type RequestSeatError =
  Invalid<StudentField | "project"> | OfferError | DuplicateRequest;

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
  /** The chosen project's current name; null for a request made before projects. */
  readonly projectName: string | null;
  /** Total price and deposit as they were when the request was made. */
  readonly price: Money;
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

/** The deposit already covered the whole price: there is nothing to collect. */
export type NoBalanceDue = { readonly kind: "no-balance-due" };

export interface RecordBalanceInput {
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
  /** What a confirmed request gives back; a pending one records none. */
  readonly refund?: RefundDraft;
}

type AdminFailure = Denied | NotFound | Unavailable;
export type ConfirmDepositError =
  AdminFailure | Invalid<DepositField> | IllegalTransition | IntensiveFull;
export type RecordBalanceError =
  | AdminFailure
  | Invalid<DepositField>
  | IllegalTransition
  | BalanceAlreadyPaid
  | NoBalanceDue;
export type CancelRequestError =
  AdminFailure | Invalid<"reason"> | InvalidRequestRefund | IllegalTransition;

export interface IntensiveRequestUseCases {
  /** Public: whether the intensivo takes requests and what it asks for. */
  getOffer(slug: string): Promise<Result<SeatOffer, OfferError>>;
  /**
   * Public: records a pending request. A filled honeypot answers like success
   * with a decoy id that was never stored.
   */
  requestSeat(input: {
    readonly slug: string;
    /** The chosen project: required, and one of the intensivo's. */
    readonly projectId: string;
    readonly student: StudentDraft;
  }): Promise<Result<{ readonly publicId: string }, RequestSeatError>>;
  /** Public: the projects of a visible workshop, whether or not it takes requests. */
  listProjects(
    slug: string,
  ): Promise<Result<readonly SeatProject[], NotFound | Unavailable>>;
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
  /** Records the one full balance payment of a confirmed request. */
  recordBalance(
    actor: MaybeActor,
    input: RecordBalanceInput,
  ): Promise<Result<StoredIntensiveRequest, RecordBalanceError>>;
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

const invalidProject = (
  code: "required" | "invalid-format",
): Invalid<"project"> => ({
  kind: "invalid",
  issues: [{ field: "project", code }],
});

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
        projects: offer.projects,
        minSeats: offer.minSeats,
        policyText: offer.policyText,
        seatsLeft,
      });
    },

    async listProjects(slug) {
      const found = await unavailableOnReject(offers.findBySlug(slug));
      if (!found.ok) return found;
      const offer = found.value;
      // Paused is still public; anything else is not.
      return offer !== null &&
        offer.upcoming &&
        (offer.status === "published" || offer.status === "paused")
        ? ok(offer.projects)
        : err({ kind: "not-found" });
    },

    async requestSeat({ slug, projectId, student }) {
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
      const project = open.value.offer.projects.find(
        (candidate) => candidate.id === projectId,
      );
      if (project === undefined)
        return err(
          invalidProject(projectId === "" ? "required" : "invalid-format"),
        );
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
          projectId: project.id,
          price: project.price,
          deposit: project.deposit,
          balance: null,
          refund: null,
        }),
      );
      if (!inserted.ok) return inserted;
      if (inserted.value.ok) return ok({ publicId });
      const refusal = inserted.value.error;
      // The project was deleted after the check above.
      return refusal.kind === "unknown-project"
        ? err(invalidProject("invalid-format"))
        : err(refusal);
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
        projectName:
          offer.value.projects.find(
            (project) => project.id === request.projectId,
          )?.name ?? null,
        // A request made before projects has no snapshot: the workshop terms.
        price: request.price ?? offer.value.price,
        deposit: request.deposit ?? offer.value.deposit,
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
      const owned = await ownedRequest(input.intensiveId, input.requestId);
      if (!owned.ok) return owned;
      // The deposit the person was quoted; a request made before projects
      // existed has no snapshot and keeps the workshop's terms.
      const due = owned.value.deposit ?? intensivo.deposit;
      const now = clock.now();
      const deposit = validateDeposit(input, due, cordobaDateOf(now));
      if (!deposit.ok) return deposit;
      const confirmed = await unavailableOnReject(
        repository.confirm({
          id: input.requestId,
          capacity: intensivo.capacity,
          amount: due,
          paidOn: deposit.value.paidOn,
          note: deposit.value.note,
          by: authorized.value.email,
          at: now,
        }),
      );
      return confirmed.ok ? confirmed.value : confirmed;
    },

    async recordBalance(actor, input) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const found = await unavailableOnReject(
        offers.findById(input.intensiveId),
      );
      if (!found.ok) return found;
      const intensivo = found.value;
      if (intensivo === null) return err({ kind: "not-found" });
      const owned = await ownedRequest(input.intensiveId, input.requestId);
      if (!owned.ok) return owned;
      const request = owned.value;
      if (request.status !== "confirmed")
        return err({ kind: "illegal-transition", from: request.status });
      if (request.balance !== null)
        return err({ kind: "balance-already-paid" });
      const due = balanceDue(
        request.price ?? intensivo.price,
        request.deposit ?? intensivo.deposit,
      );
      if (due.isZero() || due.isNegative())
        return err({ kind: "no-balance-due" });
      const now = clock.now();
      const payment = validateBalance(
        input,
        due,
        cordobaDateOf(now),
        request.paidOn,
      );
      if (!payment.ok) return payment;
      const recorded = await unavailableOnReject(
        repository.recordBalance({
          id: input.requestId,
          amount: due,
          paidOn: payment.value.paidOn,
          note: payment.value.note,
          by: authorized.value.email,
          at: now,
        }),
      );
      return recorded.ok ? recorded.value : recorded;
    },

    async cancel(actor, input) {
      const authorized = requireAdminActor(actor);
      if (!authorized.ok) return authorized;
      const reason = validateCancelReason(input.reason);
      if (!reason.ok) return reason;
      const refund =
        input.refund === undefined ? undefined : parseRefund(input.refund);
      if (refund !== undefined && !refund.ok) return refund;
      const owned = await ownedRequest(input.intensiveId, input.requestId);
      if (!owned.ok) return owned;
      const now = clock.now();
      const cancelled = await unavailableOnReject(
        repository.cancel({
          id: input.requestId,
          reason: reason.value,
          by: authorized.value.email,
          at: now,
          today: cordobaDateOf(now),
          ...(refund === undefined ? {} : { refund: refund.value }),
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
    listProjects: fail,
    requestSeat: fail,
    getRequestByPublicId: fail,
    overview: failAdmin,
    confirm: failAdmin,
    recordBalance: failAdmin,
    cancel: failAdmin,
  };
}
