import type { Money, NotFound, Result } from "~/modules/_shared";
import type {
  InvalidRequestRefund,
  IntensiveRequestStatus,
  Refund,
} from "../domain/intensive-request-core";

/** Who moved stock and when; the stock row keeps it. */
export interface RequestStockStamp {
  readonly by: string;
  readonly at: Date;
}

/**
 * The stock movements a confirmed request makes, consumer-defined. They join
 * the repository's transaction (`Tx` is that handle, opaque here), so the
 * units move in the same transaction that confirms or cancels the request.
 * Composition adapts the materials stock to this port.
 */
export interface RequestStockPort<Tx> {
  /**
   * Removes `quantity` units only while at least that many remain. Resolves
   * true when taken and false when the stock is insufficient (nothing changed).
   */
  take(
    tx: Tx,
    variantId: string,
    quantity: number,
    stamp: RequestStockStamp,
  ): Promise<boolean>;
  /** Adds `quantity` units back. */
  put(
    tx: Tx,
    variantId: string,
    quantity: number,
    stamp: RequestStockStamp,
  ): Promise<void>;
}

/** The one full balance payment of a confirmed request. */
export interface RequestBalance {
  readonly amount: Money;
  /** `YYYY-MM-DD`, a Córdoba calendar date. */
  readonly paidOn: string;
  readonly note: string | null;
  readonly by: string;
  readonly at: Date;
}

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
  /** The full balance payment, once recorded; it stays after a cancellation. */
  readonly balance: RequestBalance | null;
  /** Set by a cancellation that had money to return, $0 included. */
  readonly refund: Refund | null;
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

/** The balance was already paid; a request takes one full payment. */
export type BalanceAlreadyPaid = { readonly kind: "balance-already-paid" };

export interface BalanceInput {
  readonly id: string;
  /** What the deposit left unpaid; the caller computed it from the snapshot. */
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
  /** The Córdoba calendar day the refund date may not pass. */
  readonly today: string;
  /** Required from a confirmed request, refused from a pending one. */
  readonly refund?: Refund;
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
   * Marks every request of the intensivo that no owner opened yet as read for
   * both owners, and returns how many it just marked. A mark already there is
   * never overwritten, and nothing else about a request changes.
   */
  markSeenForIntensive(
    intensiveId: string,
    change: { readonly by: string; readonly at: Date },
  ): Promise<number>;
  /**
   * Atomically confirms a pending request while confirmed seats stay under
   * `capacity`. Two concurrent confirmations never exceed it. In the same
   * transaction the chosen project's materials are copied to the request and
   * taken from the studio stock (a line whose stock is short waits on a
   * supplier order instead).
   */
  confirm(
    input: ConfirmInput,
  ): Promise<
    Result<StoredIntensiveRequest, NotFound | IllegalTransition | IntensiveFull>
  >;
  /**
   * Records the one full balance payment of a confirmed request. A pending or
   * cancelled request refuses it, and so does a second payment.
   */
  recordBalance(
    input: BalanceInput,
  ): Promise<
    Result<
      StoredIntensiveRequest,
      NotFound | IllegalTransition | BalanceAlreadyPaid
    >
  >;
  /**
   * Cancels a pending or confirmed request in one transaction: a confirmed
   * one frees its seat, returns the units it took from the stock once and
   * records the refund (checked against what it paid). Cancelling again
   * changes nothing.
   */
  cancel(
    input: CancelInput,
  ): Promise<
    Result<
      StoredIntensiveRequest,
      NotFound | IllegalTransition | InvalidRequestRefund
    >
  >;
}
