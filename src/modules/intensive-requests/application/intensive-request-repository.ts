import type { Money, NotFound, Result } from "~/modules/_shared";
import type { IntensiveRequestStatus } from "../domain/intensive-request-core";

export interface StoredIntensiveRequest {
  readonly id: string;
  readonly publicId: string;
  readonly intensiveId: string;
  readonly status: IntensiveRequestStatus;
  readonly fullName: string;
  readonly email: string;
  readonly phoneDigits: string;
  readonly policyAcceptedAt: Date;
  readonly createdAt: Date;
  /** Deposit registered when the request is confirmed. */
  readonly paidAmount: Money | null;
  /** `YYYY-MM-DD`, a Córdoba calendar date. */
  readonly paidOn: string | null;
  readonly paymentNote: string | null;
  readonly confirmedBy: string | null;
  readonly confirmedAt: Date | null;
  readonly cancelReason: string | null;
  readonly cancelledBy: string | null;
  readonly cancelledAt: Date | null;
  /** The chosen project; null on requests made before projects existed. */
  readonly projectId: string | null;
  /** The project's price when the request was made; later edits never change it. */
  readonly price: Money | null;
  /** The project's deposit when the request was made. */
  readonly deposit: Money | null;
}

/** The same person already has a live request for this intensivo. */
export type DuplicateRequest = { readonly kind: "duplicate-request" };

/** The project is not one of the intensivo's (any more). */
export type UnknownProject = { readonly kind: "unknown-project" };

export type IllegalTransition = {
  readonly kind: "illegal-transition";
  readonly from: IntensiveRequestStatus;
};

/** Confirmed requests already fill the intensivo capacity. */
export type IntensiveFull = { readonly kind: "intensive-full" };

export interface ConfirmInput {
  readonly id: string;
  /** Capacity the confirmed seats may not exceed. */
  readonly capacity: number;
  readonly amount: Money;
  readonly paidOn: string;
  readonly note: string | null;
  readonly by: string;
  readonly at: Date;
}

export interface CancelInput {
  readonly id: string;
  readonly reason: string;
  readonly by: string;
  readonly at: Date;
}

export type RequestFilter = IntensiveRequestStatus | "all";

/** Persistence port for intensivo seat requests. */
export interface IntensiveRequestRepository {
  /**
   * A live (not cancelled) request with the same email is a duplicate. A
   * request that names a project the intensivo does not have is refused, and
   * the project cannot be deleted while the request is being written.
   */
  insert(
    request: StoredIntensiveRequest,
  ): Promise<Result<void, DuplicateRequest | UnknownProject>>;
  findById(id: string): Promise<StoredIntensiveRequest | null>;
  findByPublicId(publicId: string): Promise<StoredIntensiveRequest | null>;
  /** Oldest first, then by id. */
  listByIntensive(
    intensiveId: string,
    filter: RequestFilter,
  ): Promise<readonly StoredIntensiveRequest[]>;
  /** Seats taken: confirmed requests only, pending ones never count. */
  confirmedSeats(intensiveId: string): Promise<number>;
  /**
   * Atomically confirms a pending request while confirmed seats stay under
   * `capacity`. Two concurrent confirmations never exceed it.
   */
  confirm(
    input: ConfirmInput,
  ): Promise<
    Result<StoredIntensiveRequest, NotFound | IllegalTransition | IntensiveFull>
  >;
  /** Cancels a pending or confirmed request; a confirmed one frees its seat. */
  cancel(
    input: CancelInput,
  ): Promise<Result<StoredIntensiveRequest, NotFound | IllegalTransition>>;
}
