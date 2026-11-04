import { describe, expect, it } from "vitest";
import { Money } from "~/modules/_shared";
import { catalogContent } from "~/modules/site-content/infrastructure/content/catalog";
import {
  buildPublicImage,
  buildPublicTaller,
  buildPublicTurno,
} from "~/testing/fakes/public-catalog-builders";
import { tallerToCard, tallerToDetail } from "./mappers";

const content = catalogContent;
const normalize = (text: string) => text.replaceAll(" ", " ");

const link = {
  href: "https://wa.me/549351?text=x",
  label: "Consultá por WhatsApp",
};
const turnoLink = (index: number) => ({
  href: `https://wa.me/549351?text=turno${String(index)}`,
  label: "Consultá por WhatsApp",
});

function pesos(whole: number): Money {
  const money = Money.fromCentavos(whole * 100);
  if (!money.ok) throw new Error("invalid test money");
  return money.value;
}

describe("tallerToCard", () => {
  it("maps name, teacher, summary, every turno, the monthly fee and the link", () => {
    const image = buildPublicImage({ src: "/imagenes/cover.jpg" });
    const card = tallerToCard(
      buildPublicTaller({
        images: [image],
        turnos: [
          buildPublicTurno({ weekday: 1, startsAt: "10:00", endsAt: "12:00" }),
          buildPublicTurno({ weekday: 3, startsAt: "18:00", endsAt: "20:30" }),
        ],
      }),
      content,
    );
    expect(card.id).toBe("taller-demo");
    expect(card.image).toEqual(image);
    expect(card.name).toBe("Taller Demo");
    expect(card.teacher).toBe("Docente Demo");
    expect(card.summary).toBe("Resumen del taller de demostración.");
    expect(
      card.turnos.map((turno) => [turno.weekday, turno.timeRange]),
    ).toEqual([
      ["Lunes", "10:00 a 12:00 h"],
      ["Miércoles", "18:00 a 20:30 h"],
    ]);
    expect(normalize(card.price?.amount ?? "")).toBe("$ 58.000");
    expect(card.price?.suffix).toBe("/ mes");
    expect(card.seats).toBe("Cupo limitado");
    expect(card.href).toBe("/talleres/taller-demo");
    expect(card.ctaLabel).toBe("Ver taller");
    expect(JSON.stringify(card)).not.toContain("Descripción del taller");
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
  });

  it("keeps the turnos in the given order and never adds a duration to the card", () => {
    const card = tallerToCard(
      buildPublicTaller({
        turnos: [
          buildPublicTurno({ weekday: 2 }),
          buildPublicTurno({ weekday: 5 }),
        ],
      }),
      content,
    );
    expect(card.turnos.map((turno) => turno.weekday)).toEqual([
      "Martes",
      "Viernes",
    ]);
    expect(card.turnos.map((turno) => "duration" in turno)).toEqual([
      false,
      false,
    ]);
  });

  it("shows the no-offering notice and neither fee nor seats without an offering", () => {
    const card = tallerToCard(buildPublicTaller({ offering: null }), content);
    expect(card.notice).toBe("Próximamente abrimos inscripciones");
    expect(card.price).toBeUndefined();
    expect(card.seats).toBeUndefined();
    expect(card.paused).toBeUndefined();
  });

  it("shows only the paused badge for a paused taller, even without an offering", () => {
    const card = tallerToCard(
      buildPublicTaller({ status: "paused", offering: null }),
      content,
    );
    expect(card.paused).toBe("Inscripciones pausadas");
    expect(card.notice).toBeUndefined();
    expect(card.seats).toBeUndefined();
  });

  it("keeps the fee but drops the seats for a paused taller with an offering", () => {
    const card = tallerToCard(buildPublicTaller({ status: "paused" }), content);
    expect(card.paused).toBe("Inscripciones pausadas");
    expect(normalize(card.price?.amount ?? "")).toBe("$ 58.000");
    expect(card.seats).toBeUndefined();
  });

  it("formats whole pesos without decimals and groups thousands", () => {
    const card = tallerToCard(
      buildPublicTaller({
        offering: { period: "2026-11", fee: pesos(1250000) },
      }),
      content,
    );
    expect(normalize(card.price?.amount ?? "")).toBe("$ 1.250.000");
  });

  it("carries the teacher's short description to the card when there is one", () => {
    const card = tallerToCard(
      buildPublicTaller({
        teacher: { name: "Docente Demo", bioLine: "Tejedora desde hace años" },
      }),
      content,
    );
    expect(card.teacher).toBe("Docente Demo");
    expect(card.teacherBio).toBe("Tejedora desde hace años");

    const plain = tallerToCard(
      buildPublicTaller({ teacher: { name: "Docente Demo", bioLine: null } }),
      content,
    );
    expect(plain.teacher).toBe("Docente Demo");
    expect(plain.teacherBio).toBeUndefined();
  });

  it("uses the stand-in image and omits the teacher when missing", () => {
    const card = tallerToCard(buildPublicTaller({ teacher: null }), content);
    expect(card.image).toEqual(content.fallbackImage);
    expect(card.teacher).toBeUndefined();
  });

  it("never reads the seat capacity into the card", () => {
    const card = tallerToCard(
      buildPublicTaller({
        turnos: [buildPublicTurno({ seats: { capacity: 8, available: null } })],
      }),
      content,
    );
    expect(JSON.stringify(card)).not.toMatch(/\b8\b|capacity|available/u);
  });
});

describe("tallerToDetail", () => {
  const images = [
    buildPublicImage({ src: "/imagenes/a.jpg", alt: "Cubierta" }),
    buildPublicImage({ src: "/imagenes/b.jpg", alt: "Segunda" }),
    buildPublicImage({ src: "/imagenes/b.jpg", alt: "Segunda otra vez" }),
  ];
  const turnos = [
    buildPublicTurno({ weekday: 1, startsAt: "10:00", endsAt: "12:00" }),
    buildPublicTurno({ weekday: 3, startsAt: "18:00", endsAt: "20:30" }),
  ];

  function detailOf(overrides: Parameters<typeof buildPublicTaller>[0] = {}) {
    return tallerToDetail(
      buildPublicTaller({ images, turnos, ...overrides }),
      content,
      { main: link, turnos: turnos.map((_, index) => turnoLink(index)) },
    );
  }

  it("maps the breadcrumb, description, teacher, turnos and the monthly fee", () => {
    const detail = detailOf({
      teacher: { name: "Docente Demo", bioLine: "Bio de prueba" },
    });
    expect(detail.breadcrumb).toEqual({
      label: "Ruta de navegación",
      items: [
        { label: "Talleres", href: "/talleres" },
        { label: "Técnica de demostración" },
        { label: "Taller Demo" },
      ],
    });
    expect(detail.name).toBe("Taller Demo");
    expect(detail.description).toBe("Descripción del taller de demostración.");
    expect(detail.teacher).toEqual({
      heading: "Quién lo guía",
      name: "Docente Demo",
      bioLine: "Bio de prueba",
    });
    expect(detail.turnosHeading).toBe("Días y horarios");
    expect(detail.fee?.label).toBe("Cuota mensual");
    expect(normalize(detail.fee?.amount ?? "")).toBe("$ 58.000");
    expect(detail.action).toEqual({
      kind: "enrollment",
      href: "/talleres/taller-demo/inscripcion?period=2026-11",
      label: "Inscribirme",
    });
    expect(JSON.parse(JSON.stringify(detail))).toEqual(detail);
  });

  it("keeps the inquiry action when the offering has no turno to enroll in", () => {
    const detail = detailOf({ turnos: [] });
    expect(detail.action).toEqual({ kind: "inquiry", ...link });
  });

  it("derives the class length per turno and links each turno to its message when enrollment is not possible", () => {
    const detail = detailOf({ offering: null });
    expect(
      detail.turnos.map((turno) => [
        turno.weekday,
        turno.timeRange,
        turno.duration,
        turno.seats,
        turno.inquiry,
      ]),
    ).toEqual([
      ["Lunes", "10:00 a 12:00 h", "2 horas", undefined, turnoLink(0)],
      ["Miércoles", "18:00 a 20:30 h", "2 h 30 min", undefined, turnoLink(1)],
    ]);
    expect(detail.doubts).toBeUndefined();
  });

  it("offers ONE enrollment action, no per-turno WhatsApp links and one discreet doubts link when enrollment is possible", () => {
    const detail = detailOf();
    expect(detail.action.kind).toBe("enrollment");
    expect(detail.turnos.map((turno) => turno.inquiry)).toEqual([
      undefined,
      undefined,
    ]);
    expect(detail.turnos.map((turno) => turno.weekday)).toEqual([
      "Lunes",
      "Miércoles",
    ]);
    expect(detail.doubts).toEqual({
      href: link.href,
      label: "¿Dudas? Escribinos",
    });
  });

  it("gives a unique key to turnos that share weekday and start time", () => {
    const detail = tallerToDetail(
      buildPublicTaller({ turnos: [buildPublicTurno(), buildPublicTurno()] }),
      content,
      { main: link, turnos: [turnoLink(0), turnoLink(1)] },
    );
    const keys = detail.turnos.map((turno) => turno.key);
    expect(new Set(keys).size).toBe(2);
  });

  it("shows the paused notice, no inquiry links and no seats when paused", () => {
    const pausedLink = {
      href: "https://wa.me/549351?text=y",
      label: "Escribinos por WhatsApp",
    };
    const detail = tallerToDetail(
      buildPublicTaller({ status: "paused", offering: null, turnos }),
      content,
      { main: pausedLink, turnos: [] },
    );
    expect(detail.action).toEqual({
      kind: "paused",
      text: "Inscripciones pausadas",
      link: pausedLink,
    });
    expect(detail.notice).toBeUndefined();
    expect(detail.fee).toBeUndefined();
    expect(detail.turnos.every((turno) => turno.seats === undefined)).toBe(
      true,
    );
    expect(detail.turnos.every((turno) => turno.inquiry === undefined)).toBe(
      true,
    );
  });

  it("shows the notice and no fee or seats for an open taller without an offering", () => {
    const detail = detailOf({ offering: null });
    expect(detail.notice).toBe("Próximamente abrimos inscripciones");
    expect(detail.fee).toBeUndefined();
    expect(detail.turnos.every((turno) => turno.seats === undefined)).toBe(
      true,
    );
    expect(detail.action.kind).toBe("inquiry");
    expect(detail.turnos[0]?.inquiry).toEqual(turnoLink(0));
    expect(detail.doubts).toBeUndefined();
  });

  it("maps the project section only when a project exists", () => {
    expect(detailOf({ project: null }).project).toBeUndefined();
    const project = detailOf({
      project: {
        title: "Plato",
        description: "Un plato hondo.",
        images: [
          buildPublicImage({ src: "/imagenes/p.jpg", alt: "Plato" }),
          buildPublicImage({ src: "/imagenes/p.jpg", alt: "Plato otra vez" }),
        ],
      },
    }).project;
    expect(project?.heading).toBe("Proyectos que vamos a realizar");
    expect(project?.title).toBe("Plato");
    expect(project?.description).toBe("Un plato hondo.");
    const ids = project?.images.map((image) => image.id) ?? [];
    expect(new Set(ids).size).toBe(2);
  });

  it("keeps the cover as the hero and keys the rest of the gallery", () => {
    const detail = detailOf();
    expect(detail.image).toEqual(images[0]);
    expect(detail.gallery.map((entry) => entry.alt)).toEqual([
      "Segunda",
      "Segunda otra vez",
    ]);
    const ids = detail.gallery.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("falls back to a decorative stand-in with no gallery when there are no images", () => {
    const detail = detailOf({ images: [] });
    expect(detail.image).toEqual(content.fallbackImage);
    expect(detail.image.alt).toBe("");
    expect(detail.gallery).toEqual([]);
  });

  it("omits the teacher when missing", () => {
    expect(detailOf({ teacher: null }).teacher).toBeUndefined();
  });

  it("never reads the seat capacity into the detail", () => {
    const serialized = JSON.stringify(
      detailOf({
        turnos: [buildPublicTurno({ seats: { capacity: 8, available: null } })],
      }),
    );
    expect(serialized).not.toMatch(/capacity|available|lugares/u);
  });
});
