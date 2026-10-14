import { dateBadgeParts } from "~/app/catalog/format";
import { imageFixture } from "./ui";

/**
 * Loader-data fixtures for the catalog cards: the structural props the
 * delivery mappers will produce. They do not import the BACK builders because
 * the card props are already preformatted display strings.
 */

export const tallerCardFixture = {
  image: imageFixture,
  name: "Taller Demo",
  teacher: "Profe Demo",
  summary: "Un encuentro semanal para crear con calma.",
  turnos: [
    {
      key: "turno-1",
      weekday: "Lunes",
      timeRange: "10:00 a 12:00 h",
      duration: "2 horas",
    },
    {
      key: "turno-2",
      weekday: "Jueves",
      timeRange: "18:00 a 19:30 h",
      duration: "1 h 30 min",
    },
  ],
  price: { amount: "$ 58.000", suffix: "/ mes" },
  seats: "Cupo limitado",
  href: "/talleres/taller-demo",
  ctaLabel: "Ver taller",
};

export const tallerCardPausedFixture = {
  image: imageFixture,
  name: "Taller en pausa",
  summary: "Las inscripciones vuelven pronto.",
  turnos: [{ key: "turno-1", weekday: "Martes", timeRange: "09:00 a 11:00 h" }],
  price: { amount: "$ 58.000", suffix: "/ mes" },
  paused: "Inscripciones pausadas",
  href: "/talleres/taller-en-pausa",
  ctaLabel: "Ver taller",
};

export const tallerCardNoOfferingFixture = {
  image: imageFixture,
  name: "Taller sin cuota",
  summary: "Pronto abrimos un nuevo grupo.",
  turnos: [
    { key: "turno-1", weekday: "Viernes", timeRange: "16:00 a 18:00 h" },
  ],
  notice: "Próximamente abrimos inscripciones",
  href: "/talleres/taller-sin-cuota",
  ctaLabel: "Ver taller",
};

export const intensivoCardFixture = {
  image: imageFixture,
  date: dateBadgeParts("2026-11-14"),
  name: "Intensivo Demo",
  duration: "2 h 30 min",
  teacher: "Profe Demo",
  price: "$ 45.000",
  deposit: "Seña $ 15.000",
  seats: "Cupo limitado",
  materialsBadge: "Materiales incluidos",
  conditions: {
    label: "Condiciones",
    policyText: "Texto de política de prueba",
  },
  href: "/intensivos/intensivo-demo",
  ctaLabel: "Ver intensivo",
};

export const intensivoCardNoMaterialsFixture = {
  image: imageFixture,
  date: dateBadgeParts("2026-11-14"),
  name: "Intensivo Demo",
  duration: "2 h 30 min",
  teacher: "Profe Demo",
  price: "$ 45.000",
  deposit: "Seña $ 15.000",
  seats: "Cupo limitado",
  conditions: {
    label: "Condiciones",
    policyText: "Texto de política de prueba",
  },
  href: "/intensivos/intensivo-demo",
  ctaLabel: "Ver intensivo",
};

export const intensivoCardPausedFixture = {
  image: imageFixture,
  date: dateBadgeParts("2026-12-05"),
  name: "Intensivo en pausa",
  duration: "2 horas",
  price: "$ 45.000",
  deposit: "Seña $ 15.000",
  paused: "Inscripciones pausadas",
  conditions: {
    label: "Condiciones",
    policyText: "Texto de política de prueba",
  },
  href: "/intensivos/intensivo-en-pausa",
  ctaLabel: "Ver intensivo",
};
