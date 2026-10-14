import { Money } from "~/modules/_shared";
import type {
  PublicImage,
  PublicIntensivo,
  PublicTaller,
  PublicTeacher,
  PublicTurno,
} from "~/modules/workshops";

const fee = Money.fromCentavos(5_800_000);
if (!fee.ok) throw new Error("invalid test money");
const demoMoney = fee.value;

export const buildPublicImage = (
  overrides: Partial<PublicImage> = {},
): PublicImage => ({
  src: "/imagenes/demo.jpg",
  alt: "Imagen de demostración",
  width: 1200,
  height: 800,
  ...overrides,
});

export const buildPublicTeacher = (
  overrides: Partial<PublicTeacher> = {},
): PublicTeacher => ({
  name: "Docente Demo",
  bioLine: "Docente de demostración.",
  ...overrides,
});

export const buildPublicTurno = (
  overrides: Partial<PublicTurno> = {},
): PublicTurno => ({
  label: "Turno mañana",
  weekday: 1,
  startsAt: "10:00",
  endsAt: "12:00",
  seats: { capacity: 8, available: null },
  ...overrides,
});

export const buildPublicTaller = (
  overrides: Partial<PublicTaller> = {},
): PublicTaller => ({
  slug: "taller-demo",
  name: "Taller Demo",
  summary: "Resumen del taller de demostración.",
  description: "Descripción del taller de demostración.",
  technique: "Técnica de demostración",
  teacher: buildPublicTeacher(),
  images: [],
  status: "open",
  turnos: [buildPublicTurno()],
  offering: { period: "2026-11", fee: demoMoney },
  project: null,
  ...overrides,
});

export const buildPublicIntensivo = (
  overrides: Partial<PublicIntensivo> = {},
): PublicIntensivo => ({
  slug: "intensivo-demo",
  name: "Intensivo Demo",
  summary: "Resumen del intensivo de demostración.",
  description: "Descripción del intensivo de demostración.",
  teacher: buildPublicTeacher(),
  date: "2026-11-14",
  startsAt: "10:00",
  endsAt: "18:00",
  price: demoMoney,
  deposit: demoMoney,
  minSeats: 4,
  policyText: "Política de demostración.",
  materialsIncluded: false,
  images: [],
  status: "open",
  seats: { capacity: 10, available: null },
  ...overrides,
});
