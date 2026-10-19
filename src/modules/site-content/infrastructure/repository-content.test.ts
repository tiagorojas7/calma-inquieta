import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSiteContent } from "../application/site-content";
import { buildWhatsAppUrl } from "../domain/links";
import { fillCopyTemplate } from "../domain/copy-template";
import { findCopyViolations } from "../domain/copy-rules";
import { isPublishedPath, validateSiteContent } from "../domain/content-rules";
import {
  DEFAULT_SHARE_IMAGE,
  exclusionToken,
  isPublishable,
} from "../domain/media";
import { jpegSize } from "~/testing/media/image-size";
import { createRepositoryContentSource } from "./repository-content-source";

const source = createRepositoryContentSource();
const content = createSiteContent(source);
const CONTENT_DIR = "src/modules/site-content/infrastructure/content";
const WHATSAPP_DISPLAY = "351 739 5239";

/** Every string reachable from a value, however deeply nested. */
function stringsIn(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringsIn);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const isTestFile = (path: string) => /\.test\.tsx?$/.test(path);

describe("the repository content", () => {
  it("passes every validation rule, including registered image paths", async () => {
    const raw = await source.load();

    expect(validateSiteContent(raw)).toEqual([]);
    expect(raw.home.hero.image.mobile.src.startsWith("/media/home/")).toBe(
      true,
    );
  });

  it("contains no copy violation anywhere in its strings", async () => {
    const raw = await source.load();
    // The manifest holds English maintenance notes, not page copy.
    const strings = stringsIn([
      raw.profile,
      raw.home,
      raw.about,
      raw.contact,
      raw.comingSoon,
    ]);

    expect(strings.length).toBeGreaterThan(100);
    expect(findCopyViolations(strings)).toEqual([]);
  });

  it("never mentions the client mockups in source or in public files", () => {
    const needle = "client-proposal/mockups";
    const files = [
      ...filesUnder("src").filter((path) => !isTestFile(path)),
      ...filesUnder("public"),
    ];

    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      expect(
        file.replaceAll("\\", "/"),
        `${file} is named after it`,
      ).not.toContain(needle);
      expect(
        readFileSync(file, "latin1"),
        `${file} references it`,
      ).not.toContain(needle);
    }
  });

  it("defines the WhatsApp display string in exactly one content file", () => {
    const owners = filesUnder(CONTENT_DIR).filter((path) =>
      readFileSync(path, "utf8").includes(WHATSAPP_DISPLAY),
    );

    expect(owners.map((path) => path.replaceAll("\\", "/"))).toEqual([
      `${CONTENT_DIR}/business-profile.ts`,
    ]);
  });
});

describe("getBusinessProfile on the repository content", () => {
  it("has the confirmed address, handle and a provisional WhatsApp line", async () => {
    const profile = await content.getBusinessProfile();

    expect(profile.name).toBe("Calma Inquieta");
    expect(profile.bajada).toBe("Equilibrio entre serenidad y movimiento");
    expect(profile.address).toEqual({
      street: "Albert Sabin 6079",
      locality: "Argüello",
      city: "Córdoba",
      region: "Córdoba",
      countryCode: "AR",
    });
    expect(profile.instagram).toEqual({
      handle: "calma.inquieta",
      url: "https://www.instagram.com/calma.inquieta/",
    });
    expect(profile.whatsapp).toEqual({
      display: WHATSAPP_DISPLAY,
      provisional: true,
    });
  });

  it("exposes no email, phone, hours or geo until the client confirms them", async () => {
    const profile = await content.getBusinessProfile();

    for (const fact of ["email", "phone", "hours", "geo"]) {
      expect(profile, fact).not.toHaveProperty(fact);
    }
  });

  it("has a voseo message per topic that builds a valid wa.me link", async () => {
    const profile = await content.getBusinessProfile();

    for (const [topic, message] of Object.entries(profile.whatsappMessages)) {
      expect(message.trim(), topic).not.toBe("");
      const url = buildWhatsAppUrl(profile.whatsapp.display, message);
      expect(
        url.ok && url.value.startsWith("https://wa.me/5493517395239?text="),
      ).toBe(true);
    }
    expect(Object.keys(profile.whatsappMessages).sort()).toEqual([
      "eventos-privados",
      "general",
      "intensivos",
      "talleres",
    ]);
  });
});

describe("the drafted page content", () => {
  it("keeps every trust claim unapproved, so the reader hides the row", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();

    expect(raw.home.trustClaims.length).toBeGreaterThanOrEqual(2);
    expect(raw.home.trustClaims.every((claim) => !claim.approved)).toBe(true);
    expect(home.trustClaims).toEqual([]);
  });

  it("scopes the materials claim to intensivos", async () => {
    const raw = await source.load();
    const materials = raw.home.trustClaims.filter((claim) =>
      /materiales incluidos/i.test(claim.label),
    );

    expect(materials).toHaveLength(1);
    expect(materials[0]?.appliesTo).toBe("intensivos");
  });

  it("offers the two Inicio calls to action and no testimonials", async () => {
    const home = await content.getHomePage();

    expect(home.hero.primaryCtaLabel).toBe("Ver talleres");
    expect(home.hero.secondaryCtaLabel).toBe("Ver intensivos");
    expect(home.hero.image.mobile.alt.trim()).not.toBe("");
    expect(home.testimonials.items).toEqual([]);
  });

  it("the hero image is art-directed from published registry assets", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();
    const registered = (id: string) => {
      const asset = raw.media.assets.find((candidate) => candidate.id === id);
      if (asset?.kind !== "image") {
        throw new Error(`${id} is not a registered image`);
      }
      return asset;
    };
    const pairs = [
      ["home-hero-mobile", home.hero.image.mobile, 4 / 5],
      ["home-hero-desktop", home.hero.image.desktop, 3 / 4],
    ] as const;

    for (const [id, image, ratio] of pairs) {
      const asset = registered(id);
      const paths = asset.variants.map((variant) => variant.path);
      const candidates = (image.srcSet ?? "")
        .split(",")
        .map((entry) => entry.trim().split(" ")[0] ?? "");
      expect(candidates, id).toEqual(paths);
      expect(paths, id).toContain(image.src);
      expect(image.alt, id).toBe(asset.alt);
      expect(image.width / image.height, id).toBeCloseTo(ratio, 2);
      for (const path of [image.src, ...candidates]) {
        expect(isPublishedPath(path, raw), path).toBe(true);
        expect(
          raw.standIns.some((standIn) => standIn.path === path),
          path,
        ).toBe(false);
      }
    }
  });

  it("has an empty video list and five gallery images with alt text", async () => {
    const about = await content.getAboutPage();

    expect(about.videos).toEqual([]);
    expect(about.gallery).toHaveLength(5);
    for (const image of about.gallery) {
      expect(image.alt.trim(), image.id).not.toBe("");
    }
    expect(about.heading).toBe("Quiénes somos");
  });

  it("lists every drafted prose item as unapproved for the launch checklist", async () => {
    const raw = await source.load();
    const expected =
      raw.home.trustClaims.length +
      1 +
      raw.about.history.length +
      1 +
      raw.about.values.length +
      raw.about.faq.length +
      2; // the two catalog listing intros

    const unapproved = await content.listUnapprovedContent();

    expect(unapproved).toHaveLength(expected);
    expect(unapproved.map((item) => item.id)).toContain("about-history-1");
  });

  it("has a page for each coming-soon slug, each with a WhatsApp topic", async () => {
    const talleres = await content.getComingSoonPage("talleres");
    const intensivos = await content.getComingSoonPage("intensivos");
    const eventos = await content.getComingSoonPage("eventos-privados");

    expect(intensivos.title).toBe("Talleres intensivos");
    expect(talleres.whatsappTopic).toBe("talleres");
    expect(intensivos.whatsappTopic).toBe("intensivos");
    expect(eventos.whatsappTopic).toBe("eventos-privados");
    for (const page of [talleres, intensivos, eventos]) {
      expect(page.message.trim()).not.toBe("");
      expect(page.seo.title).not.toBe("");
    }
  });

  it("gives every page a distinct SEO title and description", async () => {
    const raw = await source.load();
    const seos = [
      raw.home.seo,
      raw.about.seo,
      raw.contact.seo,
      ...Object.values(raw.comingSoon).map((page) => page.seo),
    ];

    expect(new Set(seos.map((seo) => seo.title)).size).toBe(6);
    expect(new Set(seos.map((seo) => seo.description)).size).toBe(6);
  });

  it("registers every stand-in the manifest lists", async () => {
    const standIns = await content.listStandInAssets();

    expect(standIns).toHaveLength(12);
  });
});

const placeholdersIn = (template: string) =>
  [...template.matchAll(/\{([A-Za-z0-9]+)\}/g)].map((match) => match[1]).sort();

describe("the catalog copy", () => {
  it("returns the CatalogContent with the spec-named literals", async () => {
    const catalog = await content.getCatalogContent();

    expect(catalog.talleres.heading).toBe("Talleres");
    expect(catalog.talleres.cardCtaLabel).toBe("Ver taller");
    expect(catalog.talleres.feeLabel).toBe("Cuota mensual");
    expect(catalog.talleres.feeSuffix).toBe("/ mes");
    expect(catalog.talleres.noOffering).toBe(
      "Próximamente abrimos inscripciones",
    );
    expect(catalog.talleres.projectHeading).toBe(
      "Proyectos que vamos a realizar",
    );
    expect(catalog.intensivos.heading).toBe("Talleres intensivos");
    expect(catalog.intensivos.cardCtaLabel).toBe("Ver intensivo");
    expect(catalog.intensivos.depositLabel).toBe("Seña");
    expect(catalog.shared.seatsLimited).toBe("Cupo limitado");
    expect(catalog.shared.paused).toBe("Inscripciones pausadas");
    expect(catalog.shared.inquiryCta).toBe("Consultá por WhatsApp");
    expect(catalog.shared.pausedLinkLabel).toBe("Escribinos por WhatsApp");
  });

  it("has no copy violation in any catalog string", async () => {
    const catalog = await content.getCatalogContent();
    const strings = stringsIn(catalog);

    expect(strings.length).toBeGreaterThan(30);
    expect(findCopyViolations(strings)).toEqual([]);
  });

  it("gives each WhatsApp template exactly its placeholders", async () => {
    const { messages } = await content.getCatalogContent();

    expect(placeholdersIn(messages.taller)).toEqual(["nombre"]);
    expect(placeholdersIn(messages.turno)).toEqual([
      "dia",
      "horario",
      "nombre",
    ]);
    expect(placeholdersIn(messages.intensivo)).toEqual(["fecha", "nombre"]);
    expect(placeholdersIn(messages.paused)).toEqual(["nombre"]);
  });

  it("fills every message template with the filler", async () => {
    const { messages } = await content.getCatalogContent();
    const values = {
      nombre: "Taller Demo",
      dia: "lunes",
      horario: "10:00 a 12:00 h",
      fecha: "sábado 14 de noviembre",
    };

    for (const template of Object.values(messages)) {
      const filled = fillCopyTemplate(template, values);
      expect(filled).toContain("Taller Demo");
      expect(filled).not.toMatch(/[{}]/);
    }
  });

  it("keeps the count placeholders in the shared and intensivos templates", async () => {
    const catalog = await content.getCatalogContent();

    expect(placeholdersIn(catalog.shared.moreTurnos)).toEqual(["cantidad"]);
    expect(placeholdersIn(catalog.intensivos.minSeats)).toEqual(["cantidad"]);
    expect(
      fillCopyTemplate(catalog.intensivos.minSeats, { cantidad: "4" }),
    ).toBe("Se realiza con un mínimo de 4 personas");
    expect(fillCopyTemplate(catalog.shared.moreTurnos, { cantidad: "2" })).toBe(
      "y 2 turnos más",
    );
  });

  it("has a singular form for exactly one more turno", async () => {
    const catalog = await content.getCatalogContent();

    expect(catalog.shared.moreTurnosOne).toBe("y 1 turno más");
  });

  it("uses a registered stand-in as a decorative fallback image", async () => {
    const catalog = await content.getCatalogContent();
    const standIns = await content.listStandInAssets();

    expect(standIns.map((asset) => asset.path)).toContain(
      catalog.fallbackImage.src,
    );
    expect(catalog.fallbackImage.alt).toBe("");
  });

  it("gives the two catalog pages SEO copy distinct from every other page", async () => {
    const raw = await source.load();
    const { talleres, intensivos } = raw.catalog;
    const seos = [
      raw.home.seo,
      raw.about.seo,
      raw.contact.seo,
      ...Object.values(raw.comingSoon).map((page) => page.seo),
      talleres.seo,
      intensivos.seo,
    ];

    for (const seo of [talleres.seo, intensivos.seo]) {
      expect(seo.title.trim()).not.toBe("");
      expect(seo.description.trim()).not.toBe("");
    }
    expect(new Set(seos.map((seo) => seo.title)).size).toBe(8);
    expect(new Set(seos.map((seo) => seo.description)).size).toBe(8);
  });

  it("keeps the two listing intros as unapproved drafts on the checklist", async () => {
    const { talleres, intensivos } = await content.getCatalogContent();
    const unapproved = await content.listUnapprovedContent();

    expect(talleres.intro.approved).toBe(false);
    expect(intensivos.intro.approved).toBe(false);
    expect(unapproved).toEqual(
      expect.arrayContaining([
        { id: talleres.intro.id, area: "catalog:intros" },
        { id: intensivos.intro.id, area: "catalog:intros" },
      ]),
    );
  });

  it("passes the content validation with the catalog included", async () => {
    expect(validateSiteContent(await source.load())).toEqual([]);
  });
});

describe("media registry", () => {
  it("the shipped content validates with no issues", async () => {
    expect(validateSiteContent(await source.load())).toEqual([]);
  });

  it("the registry share image is a published 1200 by 630 jpg whose path equals DEFAULT_SHARE_IMAGE.path", async () => {
    const raw = await source.load();
    const shared = raw.media.assets.filter(({ area }) => area === "share");

    expect(shared).toHaveLength(1);
    const [asset] = shared;
    expect(asset?.kind).toBe("image");
    if (asset?.kind !== "image") {
      return;
    }
    expect(isPublishable(asset, raw.media)).toBe(true);
    expect(asset.format).toBe("jpeg");
    expect(asset.variants).toHaveLength(1);
    expect(asset.variants[0]).toEqual({
      width: 1200,
      height: 630,
      path: DEFAULT_SHARE_IMAGE.path,
    });
    expect(isPublishedPath(DEFAULT_SHARE_IMAGE.path, raw)).toBe(true);
    expect(DEFAULT_SHARE_IMAGE.path.endsWith(".jpg")).toBe(true);
    expect(jpegSize(`public${DEFAULT_SHARE_IMAGE.path}`)).toEqual({
      width: 1200,
      height: 630,
    });
  });

  it("private-event face sources are in the ledger and in no asset", async () => {
    const raw = await source.load();
    const registered = exclusionToken(JSON.stringify(raw.media.assets));

    for (const sourceId of [
      "img-20261015-wa0018",
      "img-20260926-144641667-hdr",
    ]) {
      expect(
        raw.media.rights.find((row) => row.sourceId === sourceId),
        sourceId,
      ).toMatchObject({ people: "faces", consent: "granted" });
      expect(
        raw.media.assets.some((asset) => asset.sourceId === sourceId),
        `${sourceId} is the source of an asset`,
      ).toBe(false);
      expect(registered, `${sourceId} appears in an asset`).not.toContain(
        exclusionToken(sourceId),
      );
    }
  });
});
