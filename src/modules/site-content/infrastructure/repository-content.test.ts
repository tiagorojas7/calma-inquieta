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

/** The paths an image reference can make the browser request. */
const pathsOf = (image: { src: string; srcSet?: string }) => [
  image.src,
  ...(image.srcSet ?? "")
    .split(",")
    .map((entry) => entry.trim().split(" ")[0] ?? "")
    .filter((path) => path !== ""),
];

describe("the repository content", () => {
  it("passes every validation rule, including registered image paths", async () => {
    const raw = await source.load();

    expect(validateSiteContent(raw)).toEqual([]);
    expect(raw.home.hero.backdrop.src.startsWith("/media/home/")).toBe(true);
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
    expect(home.hero.backdrop.alt.trim()).not.toBe("");
    expect(home.testimonials.items).toEqual([]);
  });

  it("the hero backdrop and collage are published registry assets of the expected ratios", async () => {
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
      ["home-hero-backdrop", home.hero.backdrop, 9 / 16],
      ["home-hero-desktop", home.hero.collage[0], 3 / 4],
      ["home-collage-wide", home.hero.collage[1], 4 / 3],
      ["home-collage-square", home.hero.collage[2], 1],
    ] as const;

    expect(home.hero.collage).toHaveLength(3);
    for (const [id, image, ratio] of pairs) {
      if (!image) throw new Error("missing hero image " + id);
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

  it("has an empty video list and alt text on every gallery image", async () => {
    const about = await content.getAboutPage();

    expect(about.videos).toEqual([]);
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
      1 + // the pull-quote
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

    expect(standIns.map(({ id }) => id)).toEqual([
      "gallery-01",
      "favicon",
      "font-cormorant-garamond-400-normal",
      "font-cormorant-garamond-400-italic",
      "font-montserrat-400-normal",
      "font-montserrat-600-normal",
      "font-cormorant-garamond-500-normal",
      "font-cormorant-garamond-600-normal",
      "font-caveat-600-normal",
    ]);
  });

  it("serves every image of Inicio, Quiénes somos and Contacto from the stand-ins or the registry, never both", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();
    const about = await content.getAboutPage();
    const contact = await content.getContactPage();
    const images = [
      home.hero.backdrop,
      ...home.hero.collage,
      home.teaser.image,
      home.teaser.accentImage,
      ...about.gallery,
      ...(contact.photo ? [contact.photo] : []),
    ];
    const registered = new Set(
      raw.media.assets.flatMap((asset) =>
        asset.kind === "image"
          ? asset.variants.map((variant) => variant.path)
          : [],
      ),
    );

    for (const image of images) {
      for (const path of pathsOf(image)) {
        const standIn = raw.standIns.some((row) => row.path === path);
        expect(standIn !== registered.has(path), path).toBe(true);
      }
    }
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

const GALLERY_ORDER = [
  "about-espacio",
  "about-manos-aro",
  "about-espejo-flecos",
  "about-mesa-taller",
  "about-macrame",
  "about-ceramica-manos",
  "about-cuenco-tejido",
  "about-acuarela",
  "about-comunidad",
  "about-jarrones",
] as const;

const CURATION_RESERVES = [
  "img-20260804-185559792-hdr",
  "img-20260917-180559720-hdr",
  "img-20260420-wa0046",
  "img-20260312-wa0051",
  "img-20260530-wa0020",
] as const;

const PRIVATE_EVENT_SOURCES = [
  "img-20261015-wa0018",
  "img-20260926-144641667-hdr",
] as const;

describe("the curated gallery", () => {
  it("the gallery has ten entries in curation order", async () => {
    const raw = await source.load();
    const about = await content.getAboutPage();
    const alts = GALLERY_ORDER.map((id) => {
      const asset = raw.media.assets.find((candidate) => candidate.id === id);
      if (asset?.kind !== "image") {
        throw new Error(`${id} is not a registered image`);
      }
      return asset.alt;
    });

    expect(about.gallery).toHaveLength(10);
    expect(about.gallery.map((image) => image.alt)).toEqual(alts);
    expect(new Set(about.gallery.map((image) => image.id)).size).toBe(10);
  });

  it("every gallery image is a published registry path with a srcSet", async () => {
    const raw = await source.load();
    const about = await content.getAboutPage();

    expect(about.gallery.length).toBeGreaterThan(0);
    for (const image of about.gallery) {
      expect(image.srcSet, image.id).toBeDefined();
      const paths = pathsOf(image);
      expect(paths.length, image.id).toBeGreaterThan(1);
      for (const path of paths) {
        expect(path.startsWith("/media/about/"), path).toBe(true);
        expect(isPublishedPath(path, raw), path).toBe(true);
        expect(
          raw.standIns.some((standIn) => standIn.path === path),
          path,
        ).toBe(false);
      }
    }
  });

  it("the intro collage has three published about photos of different ratios", async () => {
    const raw = await source.load();
    const about = await content.getAboutPage();

    expect(about.introImages).toHaveLength(3);
    const ratios = about.introImages.map((image) => image.width / image.height);
    expect(new Set(ratios.map((ratio) => ratio.toFixed(2))).size).toBe(3);
    for (const image of about.introImages) {
      expect(image.alt.trim(), image.src).not.toBe("");
      expect(image.srcSet, image.src).toBeDefined();
      for (const path of pathsOf(image)) {
        expect(path.startsWith("/media/about/"), path).toBe(true);
        expect(isPublishedPath(path, raw), path).toBe(true);
      }
    }
  });

  it("the pull-quote is an unapproved draft in the launch checklist", async () => {
    const about = await content.getAboutPage();
    const unapproved = await content.listUnapprovedContent();

    expect(about.pullQuote.text.trim()).not.toBe("");
    expect(unapproved).toContainEqual({
      id: about.pullQuote.id,
      area: "about:pull-quote",
    });
  });

  it("the curation reserves are not registered", async () => {
    const raw = await source.load();
    const registered = exclusionToken(JSON.stringify(raw.media.assets));

    for (const sourceId of CURATION_RESERVES) {
      expect(
        raw.media.assets.some((asset) => asset.sourceId === sourceId),
        `${sourceId} is the source of an asset`,
      ).toBe(false);
      expect(registered, `${sourceId} appears in an asset`).not.toContain(
        exclusionToken(sourceId),
      );
    }
  });

  it("no page image belongs to the two private-event face sources", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();
    const about = await content.getAboutPage();
    const images = [
      home.hero.backdrop,
      ...home.hero.collage,
      home.teaser.image,
      home.teaser.accentImage,
      ...about.gallery,
    ];

    let owned = 0;
    for (const image of images) {
      for (const path of pathsOf(image)) {
        const owner = raw.media.assets.find(
          (asset) =>
            asset.kind === "image" &&
            asset.variants.some((variant) => variant.path === path),
        );
        owned += owner ? 1 : 0;
        expect(PRIVATE_EVENT_SOURCES, path).not.toContain(owner?.sourceId);
      }
    }
    expect(owned).toBeGreaterThan(30);
  });
});

describe("the Inicio copy and motifs", () => {
  it("has a handwritten note, four keywords and a teaser pull phrase, all in voseo", async () => {
    const home = await content.getHomePage();

    expect(home.hero.note).toMatch(/vos/u);
    expect(home.hero.keywords).toHaveLength(4);
    expect(home.teaser.pull.trim()).not.toBe("");
    expect(
      findCopyViolations([
        home.hero.note,
        ...home.hero.keywords,
        home.teaser.pull,
      ]),
    ).toEqual([]);
  });

  it("the teaser pairs two published home photos of different ratios", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();
    const { image, accentImage } = home.teaser;

    expect(image.src).not.toBe(accentImage.src);
    expect(image.width / image.height).not.toBeCloseTo(
      accentImage.width / accentImage.height,
      1,
    );
    for (const path of [...pathsOf(image), ...pathsOf(accentImage)]) {
      expect(isPublishedPath(path, raw), path).toBe(true);
    }
  });
});

describe("the curated teaser", () => {
  it("the teaser image is the published home-teaser asset and not a stand-in", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();
    const asset = raw.media.assets.find(({ id }) => id === "home-teaser");
    if (asset?.kind !== "image") {
      throw new Error("home-teaser is not a registered image");
    }

    expect(home.teaser.image.alt).toBe(asset.alt);
    expect(home.teaser.image.alt.trim()).not.toBe("");
    expect(home.teaser.image.width / home.teaser.image.height).toBeCloseTo(
      4 / 5,
      2,
    );
    expect(pathsOf(home.teaser.image)).toEqual([
      home.teaser.image.src,
      ...asset.variants.map((variant) => variant.path),
    ]);
    for (const path of pathsOf(home.teaser.image)) {
      expect(path.startsWith("/media/home/"), path).toBe(true);
      expect(isPublishedPath(path, raw), path).toBe(true);
      expect(
        raw.standIns.some((standIn) => standIn.path === path),
        path,
      ).toBe(false);
    }
  });
});

describe("the curated contact photo", () => {
  it("the contact photo is a published registry asset and not a stand-in", async () => {
    const raw = await source.load();
    const contact = await content.getContactPage();
    const asset = raw.media.assets.find(({ id }) => id === "contact-fachada");
    if (asset?.kind !== "image") {
      throw new Error("contact-fachada is not a registered image");
    }
    const photo = contact.photo;

    expect(asset.sourceId).toBe("img-20260530-wa0019");
    expect(photo).toBeDefined();
    if (!photo) {
      return;
    }
    expect(photo.alt).toBe(asset.alt);
    expect(photo.alt.trim()).not.toBe("");
    expect(photo.width / photo.height).toBeCloseTo(3 / 4, 2);
    for (const path of pathsOf(photo)) {
      expect(path.startsWith("/media/contact/"), path).toBe(true);
      expect(isPublishedPath(path, raw), path).toBe(true);
      expect(
        raw.standIns.some((standIn) => standIn.path === path),
        path,
      ).toBe(false);
    }
  });
});

describe("the brand logos", () => {
  it("are the published dark and light registry logos, decorative beside the wordmark", async () => {
    const raw = await source.load();
    const brand = await content.getBrand();

    expect(brand.logo).toBeDefined();
    expect(brand.logoLight).toBeDefined();
    expect(raw.brand.logo.src).toContain("/media/brand/brand-logo-");
    expect(raw.brand.logoLight.src).toContain("/media/brand/brand-logo-light-");
    for (const logo of [raw.brand.logo, raw.brand.logoLight]) {
      expect(logo.alt).toBe("");
      expect(logo.srcSet?.split(",")).toHaveLength(3);
      for (const path of pathsOf(logo)) {
        expect(isPublishedPath(path, raw), path).toBe(true);
      }
    }
  });
});

describe("the launch gate on the repository content", () => {
  it("after this PR the image stand-ins are gallery-01 and favicon, the font stand-ins are seven and unpublishedMedia is empty", async () => {
    const gate = await content.getLaunchGate();

    expect(gate.imageStandIns.map(({ id }) => id)).toEqual([
      "gallery-01",
      "favicon",
    ]);
    expect(gate.fontStandIns).toHaveLength(7);
    expect(gate.unpublishedMedia).toEqual([]);
  });
});

describe("the hero loop", () => {
  it("the hero has a loop with a poster of alt empty and WebM then MP4 sources", async () => {
    const raw = await source.load();
    const home = await content.getHomePage();
    const { loop } = home.hero;

    expect(loop).toBeDefined();
    if (!loop) {
      return;
    }
    expect(loop.poster.alt).toBe("");
    expect(loop.poster.width / loop.poster.height).toBeCloseTo(4 / 5, 2);
    expect(loop.width).toBe(720);
    expect(loop.height).toBe(900);
    expect(loop.sources.map(({ type }) => type)).toEqual([
      "video/webm",
      "video/mp4",
    ]);
    for (const { src } of loop.sources) {
      expect(src).toMatch(
        /^\/media\/video\/home-loop-720\.[0-9a-f]{8}\.(webm|mp4)$/,
      );
      expect(isPublishedPath(src, raw), src).toBe(true);
    }
    expect(isPublishedPath(loop.poster.src, raw)).toBe(true);
    for (const path of (loop.poster.srcSet ?? "")
      .split(",")
      .map((entry) => entry.trim().split(" ")[0] ?? "")) {
      expect(isPublishedPath(path, raw), path).toBe(true);
    }
    expect(loop.poster.src.startsWith("/media/video/")).toBe(true);
  });
});
