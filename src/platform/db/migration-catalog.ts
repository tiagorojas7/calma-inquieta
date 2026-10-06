import journal from "../../../drizzle/meta/_journal.json";

const tagsByTimestamp = new Map<number, string>(
  journal.entries.map((entry) => [entry.when, entry.tag]),
);

/**
 * drizzle stores the journal entry's `when` as `created_at`, so the newest row
 * of `drizzle.__drizzle_migrations` maps back to a human-readable tag.
 */
export function migrationTagFor(createdAtMillis: number): string {
  return (
    tagsByTimestamp.get(createdAtMillis) ?? `unknown:${String(createdAtMillis)}`
  );
}
