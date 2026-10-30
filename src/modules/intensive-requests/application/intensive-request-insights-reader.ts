/** What the confirmed requests of one intensivo registered. */
export interface IntensiveRegistrationRow {
  readonly intensiveId: string;
  /** Confirmed requests: the only ones that take a seat. */
  readonly confirmedSeats: number;
  /** Sum of the deposits and payments registered when confirming. */
  readonly paidCentavos: number;
}

/** Aggregations of the seat requests other modules read for statistics. */
export interface IntensiveRequestInsightsReader {
  registrations(
    intensiveIds: readonly string[],
  ): Promise<readonly IntensiveRegistrationRow[]>;
  /** Requests waiting for their deposit, across every intensivo. */
  pendingRequests(): Promise<number>;
}
