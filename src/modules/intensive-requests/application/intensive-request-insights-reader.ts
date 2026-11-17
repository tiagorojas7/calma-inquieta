/** What the confirmed requests of one intensivo registered. */
export interface IntensiveRegistrationRow {
  readonly intensiveId: string;
  /** Confirmed requests: the only ones that take a seat. */
  readonly confirmedSeats: number;
  /** Every payment the confirmed requests received: deposits plus balances. */
  readonly collectedCentavos: number;
  /**
   * What the fully paid requests received, deposit plus balance. A confirmed
   * request counts only once its balance is recorded, or when the deposit was
   * the whole price; the others wait and settle nothing yet.
   */
  readonly settledCentavos: number;
  /**
   * The supplier cost captured on the materials allocated to those same
   * requests (quantity times each line's frozen unit cost); a line without a
   * captured cost adds nothing.
   */
  readonly materialsCostCentavos: number;
}

/** A seat request no owner opened yet, as the panel bell shows it. */
export interface UnseenSeatRequestRow {
  readonly id: string;
  readonly intensiveId: string;
  /** Null when the workshop row is gone. */
  readonly workshopName: string | null;
  readonly fullName: string;
  readonly createdAt: Date;
}

/** A payment a request still owes: the deposit, or the balance after it. */
export interface PendingSeatPaymentRow {
  readonly id: string;
  readonly intensiveId: string;
  readonly workshopName: string | null;
  readonly fullName: string;
  readonly kind: "deposit" | "balance";
  readonly amountCentavos: number;
  readonly createdAt: Date;
}

/** Aggregations of the seat requests other modules read for statistics. */
export interface IntensiveRequestInsightsReader {
  registrations(
    intensiveIds: readonly string[],
  ): Promise<readonly IntensiveRegistrationRow[]>;
  /** Requests waiting for their deposit, across every intensivo. */
  pendingRequests(): Promise<number>;
  /** Requests that were not cancelled and that no owner opened, newest first. */
  unseenRequests(): Promise<readonly UnseenSeatRequestRow[]>;
  /**
   * What the requests still owe, oldest first: the deposit of every pending
   * request, and the balance of every confirmed one whose price is above its
   * deposit and that has no balance recorded. No due dates.
   */
  pendingPayments(): Promise<readonly PendingSeatPaymentRow[]>;
}
