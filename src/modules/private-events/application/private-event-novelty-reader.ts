/** A private-event request nobody opened yet, as the panel bell shows it. */
export interface UnseenPrivateEvent {
  readonly id: string;
  readonly fullName: string;
  /** `YYYY-MM-DD`, the day the visitor asked for. */
  readonly desiredDate: string;
  readonly createdAt: Date;
}

/** What other modules read to count and list the new requests. */
export interface PrivateEventNoveltyReader {
  /** Requests no owner has opened, newest first. */
  unseen(): Promise<readonly UnseenPrivateEvent[]>;
}
