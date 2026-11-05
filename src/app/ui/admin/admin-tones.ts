/** What a figure means: money that comes in, money that goes out, or people. */
export type AdminTone = "income" | "expense" | "people";

export const ADMIN_TONE_TEXT: Record<AdminTone, string> = {
  income: "text-status-green-fg",
  expense: "text-status-orange-fg",
  people: "text-status-blue-fg",
};

export const ADMIN_TONE_FILL: Record<AdminTone, string> = {
  income: "bg-status-green-bg",
  expense: "bg-status-orange-bg",
  people: "bg-status-blue-bg",
};
