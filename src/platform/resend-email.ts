import { err, ok, type Result } from "~/modules/_shared";

const RESEND_URL = "https://api.resend.com/emails";

export interface ResendMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

export interface ResendSenderOptions {
  readonly apiKey: string;
  /** `Name <address>` of a domain verified in Resend. */
  readonly from: string;
  readonly fetcher?: typeof fetch;
}

export interface ResendFailure {
  readonly kind:
    "resend-rejected" | "resend-unavailable" | "resend-unreachable";
}

/**
 * Sends through the Resend HTTP API. Failures carry a name only: neither the
 * key, the addresses nor the bodies reach an error, a log or a response.
 */
export function createResendSender(options: ResendSenderOptions) {
  const fetcher = options.fetcher ?? fetch;
  return {
    async send(message: ResendMessage): Promise<Result<void, ResendFailure>> {
      let response: Response;
      try {
        response = await fetcher(RESEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: options.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            html: message.html,
          }),
        });
      } catch {
        return err({ kind: "resend-unreachable" });
      }
      if (response.ok) return ok(undefined);
      return err({
        kind: response.status >= 500 ? "resend-unavailable" : "resend-rejected",
      });
    },
  };
}
