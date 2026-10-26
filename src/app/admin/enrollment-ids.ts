const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids are uuids in storage; anything else is absent and never reaches the store. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
