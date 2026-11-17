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

/** Aggregations of the seat requests other modules read for statistics. */
export interface IntensiveRequestInsightsReader {
  registrations(
    intensiveIds: readonly string[],
  ): Promise<readonly IntensiveRegistrationRow[]>;
  /** Requests waiting for their deposit, across every intensivo. */
  pendingRequests(): Promise<number>;
}
