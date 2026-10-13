import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSiteContent } from "../application/site-content";
import { buildWhatsAppUrl } from "../domain/links";
import { findCopyViolations } from "../domain/copy-rules";
import { validateSiteContent } from "../domain/content-rules";
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
    expect(raw.home.hero.images.length).toBeGreaterThan(0);
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
    expect(home.hero.images).toHaveLength(3);
    expect(home.testimonials.items).toEqual([]);
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
      raw.about.faq.length;

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
