import { describe, expect, it } from "vitest";
import { catalogContent } from "~/modules/site-content/infrastructure/content/catalog";
import {
  buildPublicImage,
  buildPublicIntensivo,
  buildPublicTaller,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { dateBadgeParts } from "./format";
import { intensivoToUpcomingItem, tallerToActivityCard } from "./mappers";

const content = catalogContent;

describe("tallerToActivityCard (Inicio)", () => {
  it("maps name, summary, cover, link and both turnos without a price", () => {
    const image = buildPublicImage({ src: "/imagenes/cover.jpg" });
    const card = tallerToActivityCard(
      buildPublicTaller({
        images: [image],
        turnos: [
          buildPublicTurno({ weekday: 1, startsAt: "10:00", endsAt: "12:00" }),
          buildPublicTurno({ weekday: 3, startsAt: "18:00", endsAt: "20:00" }),
        ],
      }),
      content,
    );
    expect(card).toEqual({
      id: "taller-demo",
      image,
      title: "Taller Demo",
      description: "Resumen del taller de demostración.",
      schedule: "Lunes, 10:00 a 12:00 h · Miércoles, 18:00 a 20:00 h",
      badge: undefined,
      href: "/talleres/taller-demo",
      ctaLabel: "Ver taller",
    });
    expect(JSON.stringify(card)).not.toMatch(/\$|58|fee|cuota/iu);
  });

  it("uses the stand-in image when the taller has none", () => {
    const card = tallerToActivityCard(buildPublicTaller(), content);
    expect(card.image).toEqual(content.fallbackImage);
  });

  it("shows at most two turnos and counts the rest", () => {
    const card = tallerToActivityCard(
      buildPublicTaller({
        turnos: [
          buildPublicTurno({ weekday: 1 }),
          buildPublicTurno({ weekday: 2 }),
          buildPublicTurno({ weekday: 4 }),
          buildPublicTurno({ weekday: 5 }),
        ],
      }),
      content,
    );
    expect(card.schedule).toBe(
      "Lunes, 10:00 a 12:00 h · Martes, 10:00 a 12:00 h y 2 turnos más",
    );
  });

  it("uses the singular when exactly one turno is hidden", () => {
    const card = tallerToActivityCard(
      buildPublicTaller({
        turnos: [
          buildPublicTurno({ weekday: 1 }),
          buildPublicTurno({ weekday: 2 }),
          buildPublicTurno({ weekday: 4 }),
        ],
      }),
      content,
    );
    expect(card.schedule).toBe(
      "Lunes, 10:00 a 12:00 h · Martes, 10:00 a 12:00 h y 1 turno más",
    );
  });

  it("omits the schedule when there are no turnos", () => {
    const card = tallerToActivityCard(
      buildPublicTaller({ turnos: [] }),
      content,
    );
    expect(card.schedule).toBeUndefined();
  });

  it("carries the paused badge", () => {
    const card = tallerToActivityCard(
      buildPublicTaller({ status: "paused" }),
      content,
    );
    expect(card.badge).toBe("Inscripciones pausadas");
  });
});

describe("intensivoToUpcomingItem (Inicio)", () => {
  it("maps the date badge parts, title, time range and link", () => {
    const item = intensivoToUpcomingItem(buildPublicIntensivo(), content);
    expect(item).toEqual({
      id: "intensivo-demo",
      date: dateBadgeParts("2026-11-14"),
      title: "Intensivo Demo",
      detail: "10:00 a 18:00 h",
      badge: undefined,
      href: "/intensivos/intensivo-demo",
      ctaLabel: "Ver intensivo",
    });
    expect(JSON.stringify(item)).not.toMatch(/\$|58/u);
  });

  it("carries the paused badge", () => {
    const item = intensivoToUpcomingItem(
      buildPublicIntensivo({ status: "paused" }),
      content,
    );
    expect(item.badge).toBe("Inscripciones pausadas");
  });

  it("keeps the given order when mapping a list", () => {
    const items = [
      buildPublicIntensivo({ slug: "a" }),
      buildPublicIntensivo({ slug: "b" }),
      buildPublicIntensivo({ slug: "c" }),
    ].map((intensivo) => intensivoToUpcomingItem(intensivo, content));
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});
