/** What a figure means: money that comes in, money that goes out, or people. */
export type AdminTone = "income" | "expense" | "people" | "pending";

export const ADMIN_TONE_TEXT: Record<AdminTone, string> = {
  income: "text-status-green-fg",
  expense: "text-status-orange-fg",
  people: "text-status-blue-fg",
  pending: "text-admin-warning-fg",
};

export const ADMIN_TONE_FILL: Record<AdminTone, string> = {
  income: "bg-status-green-bg",
  expense: "bg-status-orange-bg",
  people: "bg-status-blue-bg",
  pending: "bg-admin-warning-bg",
};
