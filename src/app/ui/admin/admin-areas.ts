import type { IconName } from "../atoms/icon";

/** One key per admin area; the key is also the icon name and the color token. */
export type AdminAreaKey =
  | "home"
  | "enrollments"
  | "workshops"
  | "intensives"
  | "materials"
  | "attendance"
  | "teachers"
  | "suppliers"
  | "students"
  | "events"
  | "reminders"
  | "statistics"
  | "catalog";

export interface AdminAreaStyle {
  readonly icon: IconName;
  /** Icon chip: tint behind the strong color. */
  readonly chip: string;
  /** Header band and active nav entry. */
  readonly band: string;
  /** The strong color alone, for an icon on a white or banded surface. */
  readonly ink: string;
}

// Full class names so Tailwind sees them; pairs are checked in admin-colors.test.ts.
export const ADMIN_AREAS: Record<AdminAreaKey, AdminAreaStyle> = {
  home: {
    icon: "home",
    chip: "bg-area-home-bg text-area-home-fg",
    band: "bg-area-home-bg text-area-home-fg",
    ink: "text-area-home-fg",
  },
  enrollments: {
    icon: "enrollments",
    chip: "bg-area-enrollments-bg text-area-enrollments-fg",
    band: "bg-area-enrollments-bg text-area-enrollments-fg",
    ink: "text-area-enrollments-fg",
  },
  workshops: {
    icon: "workshops",
    chip: "bg-area-workshops-bg text-area-workshops-fg",
    band: "bg-area-workshops-bg text-area-workshops-fg",
    ink: "text-area-workshops-fg",
  },
  intensives: {
    icon: "intensives",
    chip: "bg-area-intensives-bg text-area-intensives-fg",
    band: "bg-area-intensives-bg text-area-intensives-fg",
    ink: "text-area-intensives-fg",
  },
  materials: {
    icon: "materials",
    chip: "bg-area-materials-bg text-area-materials-fg",
    band: "bg-area-materials-bg text-area-materials-fg",
    ink: "text-area-materials-fg",
  },
  attendance: {
    icon: "attendance",
    chip: "bg-area-attendance-bg text-area-attendance-fg",
    band: "bg-area-attendance-bg text-area-attendance-fg",
    ink: "text-area-attendance-fg",
  },
  teachers: {
    icon: "teachers",
    chip: "bg-area-teachers-bg text-area-teachers-fg",
    band: "bg-area-teachers-bg text-area-teachers-fg",
    ink: "text-area-teachers-fg",
  },
  suppliers: {
    icon: "suppliers",
    chip: "bg-area-suppliers-bg text-area-suppliers-fg",
    band: "bg-area-suppliers-bg text-area-suppliers-fg",
    ink: "text-area-suppliers-fg",
  },
  students: {
    icon: "students",
    chip: "bg-area-students-bg text-area-students-fg",
    band: "bg-area-students-bg text-area-students-fg",
    ink: "text-area-students-fg",
  },
  events: {
    icon: "events",
    chip: "bg-area-events-bg text-area-events-fg",
    band: "bg-area-events-bg text-area-events-fg",
    ink: "text-area-events-fg",
  },
  reminders: {
    icon: "reminders",
    chip: "bg-area-reminders-bg text-area-reminders-fg",
    band: "bg-area-reminders-bg text-area-reminders-fg",
    ink: "text-area-reminders-fg",
  },
  statistics: {
    icon: "statistics",
    chip: "bg-area-statistics-bg text-area-statistics-fg",
    band: "bg-area-statistics-bg text-area-statistics-fg",
    ink: "text-area-statistics-fg",
  },
  catalog: {
    icon: "catalog",
    chip: "bg-area-catalog-bg text-area-catalog-fg",
    band: "bg-area-catalog-bg text-area-catalog-fg",
    ink: "text-area-catalog-fg",
  },
};
