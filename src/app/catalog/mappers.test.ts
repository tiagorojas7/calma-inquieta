import { describe, expect, it } from "vitest";
import { catalogContent } from "~/modules/site-content/infrastructure/content/catalog";
import {
  buildPublicImage,
  buildPublicIntensivo,
  buildPublicTaller,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { Money } from "~/modules/_shared";
import { dateBadgeParts } from "./format";
import {
  intensivoToCard,
  intensivoToDetail,
  intensivoToUpcomingItem,
  tallerToActivityCard,
} from "./mappers";

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

function pesos(centavos: number): Money {
  const result = Money.fromCentavos(centavos);
  if (!result.ok) throw new Error("invalid test amount");
  return result.value;
}

const normalize = (text: string) => text.replaceAll(" ", " ");
const link = {
  href: "https://wa.me/549351?text=x",
  label: "Consultá por WhatsApp",
};

describe("intensivoToCard (listing)", () => {
  const intensivo = buildPublicIntensivo({
    startsAt: "10:00",
    endsAt: "12:30",
    price: pesos(4_500_000),
    deposit: pesos(1_500_000),
    materialsIncluded: true,
    policyText: "Texto de política de prueba",
  });

  it("maps the card to plain, preformatted strings", () => {
    const card = intensivoToCard(intensivo, content);
    expect(card.id).toBe("intensivo-demo");
    expect(card.name).toBe("Intensivo Demo");
    expect(card.date).toEqual(dateBadgeParts("2026-11-14"));
    expect(card.duration).toBe("2 h 30 min");
    expect(card.teacher).toBe("Docente Demo");
    expect(normalize(card.price)).toBe("$ 45.000");
    expect(normalize(card.deposit)).toBe("Seña $ 15.000");
    expect(card.seats).toBe("Cupo limitado");
    expect(card.materialsBadge).toBe("Materiales incluidos");
    expect(card.paused).toBeUndefined();
    expect(card.conditions).toEqual({
      label: "Condiciones",
      policyText: "Texto de política de prueba",
    });
    expect(card.href).toBe("/intensivos/intensivo-demo");
    expect(card.ctaLabel).toBe("Ver intensivo");
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
  });

  it("derives whole-hour and one-hour durations", () => {
    expect(
      intensivoToCard(
        buildPublicIntensivo({ startsAt: "10:00", endsAt: "12:00" }),
        content,
      ).duration,
    ).toBe("2 horas");
    expect(
      intensivoToCard(
        buildPublicIntensivo({ startsAt: "10:00", endsAt: "11:00" }),
        content,
      ).duration,
    ).toBe("1 hora");
  });

  it("shows no materials badge when materials are not included", () => {
    const card = intensivoToCard(
      buildPublicIntensivo({ materialsIncluded: false }),
      content,
    );
    expect(card.materialsBadge).toBeUndefined();
  });

  it("flags a paused intensivo and hides the seats", () => {
    const card = intensivoToCard(
      buildPublicIntensivo({ status: "paused" }),
      content,
    );
    expect(card.paused).toBe("Inscripciones pausadas");
    expect(card.seats).toBeUndefined();
  });

  it("omits the teacher when there is none", () => {
    const card = intensivoToCard(
      buildPublicIntensivo({ teacher: null }),
      content,
    );
    expect(card.teacher).toBeUndefined();
  });

  it("uses a decorative stand-in when there are no images", () => {
    const card = intensivoToCard(buildPublicIntensivo(), content);
    expect(card.image).toEqual(content.fallbackImage);
    expect(card.image.alt).toBe("");
  });

  it("uses the cover image with its alt text", () => {
    const cover = buildPublicImage({ src: "/imagenes/a.jpg", alt: "Manos" });
    const card = intensivoToCard(
      buildPublicIntensivo({ images: [cover] }),
      content,
    );
    expect(card.image).toEqual(cover);
  });
});

describe("intensivoToDetail", () => {
  const images = [
    buildPublicImage({ src: "/imagenes/a.jpg", alt: "Cubierta" }),
    buildPublicImage({ src: "/imagenes/b.jpg", alt: "Segunda" }),
    buildPublicImage({ src: "/imagenes/b.jpg", alt: "Segunda otra vez" }),
  ];

  it("maps the full detail, with the minimum seats line and an inquiry action", () => {
    const detail = intensivoToDetail(
      buildPublicIntensivo({
        startsAt: "10:00",
        endsAt: "12:00",
        price: pesos(4_500_000),
        deposit: pesos(1_500_000),
        minSeats: 6,
        materialsIncluded: true,
        teacher: { name: "Docente Demo", bioLine: "Bio de prueba" },
      }),
      content,
      link,
    );
    expect(detail.breadcrumb).toEqual({
      label: "Ruta de navegación",
      items: [
        { label: "Talleres intensivos", href: "/intensivos" },
        { label: "Intensivo Demo" },
      ],
    });
    expect(detail.dateLine).toBe("Sábado 14 de noviembre");
    expect(detail.timeRange).toBe("10:00 a 12:00 h");
    expect(detail.duration).toBe("2 horas");
    expect(detail.description).toBe(
      "Descripción del intensivo de demostración.",
    );
    expect(detail.teacher).toEqual({
      heading: "Quién lo guía",
      name: "Docente Demo",
      bioLine: "Bio de prueba",
    });
    expect(normalize(detail.price.amount)).toBe("$ 45.000");
    expect(detail.price.label).toBe("Precio");
    expect(normalize(detail.deposit.amount)).toBe("$ 15.000");
    expect(detail.deposit.label).toBe("Seña");
    expect(detail.conditions.minSeats).toBe(
      "Se realiza con un mínimo de 6 personas",
    );
    expect(detail.materialsBadge).toBe("Materiales incluidos");
    expect(detail.seats).toBe("Cupo limitado");
    expect(detail.action).toEqual({ kind: "inquiry", ...link });
    expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
  });

  it("replaces the inquiry action with the reservation link when the seat request is open", () => {
    const reservation = {
      href: "/intensivos/intensivo-demo/reserva",
      label: "Reservar mi lugar",
    };
    const detail = intensivoToDetail(
      buildPublicIntensivo(),
      content,
      link,
      reservation,
    );
    expect(detail.action).toEqual({ kind: "reserve", ...reservation });
  });

  it("keeps the paused notice even when a reservation link is offered", () => {
    const detail = intensivoToDetail(
      buildPublicIntensivo({ status: "paused" }),
      content,
      link,
      { href: "/x", label: "Reservar mi lugar" },
    );
    expect(detail.action.kind).toBe("paused");
  });

  it("shows the paused notice instead of the inquiry action", () => {
    const pausedLink = {
      href: "https://wa.me/549351?text=y",
      label: "Escribinos por WhatsApp",
    };
    const detail = intensivoToDetail(
      buildPublicIntensivo({ status: "paused" }),
      content,
      pausedLink,
    );
    expect(detail.action).toEqual({
      kind: "paused",
      text: "Inscripciones pausadas",
      link: pausedLink,
    });
    expect(detail.seats).toBeUndefined();
  });

  it("keeps the alt text, and keys gallery entries by index and source", () => {
    const detail = intensivoToDetail(
      buildPublicIntensivo({ images }),
      content,
      link,
    );
    expect(detail.image).toEqual(images[0]);
    expect(detail.gallery.map((entry) => entry.alt)).toEqual([
      "Segunda",
      "Segunda otra vez",
    ]);
    const ids = detail.gallery.map((entry) => entry.id);
    expect(ids).toEqual(["1-/imagenes/b.jpg", "2-/imagenes/b.jpg"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to a decorative stand-in with no gallery when there are no images", () => {
    const detail = intensivoToDetail(buildPublicIntensivo(), content, link);
    expect(detail.image).toEqual(content.fallbackImage);
    expect(detail.image.alt).toBe("");
    expect(detail.gallery).toEqual([]);
  });

  it("omits teacher and bio line when they are missing", () => {
    expect(
      intensivoToDetail(buildPublicIntensivo({ teacher: null }), content, link)
        .teacher,
    ).toBeUndefined();
    const detail = intensivoToDetail(
      buildPublicIntensivo({ teacher: { name: "Docente", bioLine: null } }),
      content,
      link,
    );
    expect(detail.teacher).toEqual({
      heading: "Quién lo guía",
      name: "Docente",
    });
  });
});
