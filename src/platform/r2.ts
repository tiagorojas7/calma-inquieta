/**
 * The slice of an R2 bucket the media adapter uses. Declaring it here keeps
 * Node-compiled code free of the Workers runtime types; a real `R2Bucket`
 * satisfies it structurally.
 */
export interface R2ObjectBodyLike {
  readonly httpMetadata?: { readonly contentType?: string | undefined };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2BucketLike {
  put(
    key: string,
    value: Uint8Array,
    options?: {
      readonly httpMetadata?: { readonly contentType?: string };
      readonly onlyIf?: { readonly etagDoesNotMatch?: string };
    },
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

const BINDING_NAME = "MEDIA";

function isBucket(value: unknown): value is R2BucketLike {
  if (typeof value !== "object" || value === null) return false;
  return ["put", "get", "delete"].every(
    (method) => typeof Reflect.get(value, method) === "function",
  );
}

/**
 * `MEDIA` is a binding, not a variable, so it is read outside every env schema
 * and its absence never fails a request: callers get `null` and degrade.
 */
export function readMediaBinding(env: object): R2BucketLike | null {
  const binding: unknown = Reflect.get(env, BINDING_NAME);
  return isBucket(binding) ? binding : null;
}
