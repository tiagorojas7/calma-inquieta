import { describe, expect, it } from "vitest";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "~/testing/fakes/in-memory-site-content-source";
import type { RawSiteContent } from "../domain/page-content";
import { createSiteContent } from "./site-content";

const content = (raw: RawSiteContent = buildRawSiteContent()) =>
  createSiteContent(createInMemorySiteContentSource(raw));

describe("createSiteContent", () => {
  it("publishes the business profile with only confirmed facts", async () => {
    const base = buildRawSiteContent();
    const profile = await content({
      ...base,
      profile: {
        ...base.profile,
        email: { value: "hola@example.test", confirmed: false },
        phone: { value: "351 111 1111", confirmed: true },
      },
    }).getBusinessProfile();

    expect(profile.instagram.url).toBe(
      "https://www.instagram.com/calma.inquieta/",
    );
    expect(profile.phone).toBe("351 111 1111");
    expect(profile).not.toHaveProperty("email");
  });

  it("returns only approved trust claims and consented testimonials on Inicio", async () => {
    const base = buildRawSiteContent();
    const [claim] = base.home.trustClaims;
    if (!claim) {
      return expect.unreachable("the fake has a trust claim");
    }
    const consented = {
      id: "t-1",
      quote: "q",
      author: "Ana",
      consent: { written: true, recordedOn: "2026-10-01" },
    } as const;
    const home = await content({
      ...base,
      home: {
        ...base.home,
        trustClaims: [claim, { ...claim, id: "claim-2", approved: false }],
        testimonials: {
          heading: "Voces",
          items: [consented, { id: "t-2", quote: "q", author: "Bea" }],
        },
      },
    }).getHomePage();

    expect(home.trustClaims.map((c) => c.id)).toEqual([claim.id]);
    expect(home.testimonials.items).toEqual([consented]);
    expect(home.testimonials.heading).toBe("Voces");
  });

  it("getHomePage returns hero.image", async () => {
    const base = buildRawSiteContent();
    const home = await content(base).getHomePage();

    expect(home.hero.image).toEqual(base.home.hero.image);
    expect(home.hero.image.mobile.src).not.toBe("");
    expect(home.hero.image.desktop.src).not.toBe("");
    expect(home.hero).not.toHaveProperty("images");
  });

  it("returns empty arrays, not null, for lists with no content", async () => {
    const base = buildRawSiteContent();
    const about = await content({
      ...base,
      about: { ...base.about, values: [], gallery: [], videos: [], faq: [] },
    }).getAboutPage();

    expect(about.values).toEqual([]);
    expect(about.gallery).toEqual([]);
    expect(about.videos).toEqual([]);
    expect(about.faq).toEqual([]);
    expect(about.history.length).toBeGreaterThan(0);
  });

  it("getAboutPage drops a gallery entry whose asset is pending", async () => {
    const base = buildRawSiteContent();
    const path = "/media/about/about-pending-480.0a1b2c3d.webp";
    const about = await content({
      ...base,
      about: {
        ...base.about,
        gallery: [
          ...base.about.gallery,
          {
            id: "gallery-pending",
            src: path,
            alt: "Una ronda",
            width: 480,
            height: 600,
          },
        ],
      },
      media: {
        assets: [
          {
            kind: "image",
            id: "about-pending",
            sourceId: "about-pending-source",
            area: "about",
            alt: "Una ronda",
            format: "webp",
            variants: [{ width: 480, height: 600, path }],
          },
        ],
        rights: [
          {
            sourceId: "about-pending-source",
            people: "faces",
            consent: "pending",
          },
        ],
        excluded: [],
      },
    }).getAboutPage();

    expect(about.gallery).toEqual(base.about.gallery);
  });

  it("getContactPage drops an unpublishable photo", async () => {
    const base = buildRawSiteContent();
    const path = "/media/contact/contact-pending-480.0a1b2c3d.webp";
    const pending = {
      ...base,
      contact: {
        ...base.contact,
        photo: {
          src: path,
          alt: "El frente del local",
          width: 480,
          height: 640,
        },
      },
      media: {
        assets: [
          {
            kind: "image",
            id: "contact-pending",
            sourceId: "contact-pending-source",
            area: "contact",
            alt: "El frente del local",
            format: "webp",
            variants: [{ width: 480, height: 640, path }],
          },
        ],
        rights: [
          {
            sourceId: "contact-pending-source",
            people: "faces",
            consent: "pending",
          },
        ],
        excluded: [],
      },
    } satisfies RawSiteContent;

    const withheld = await content(pending).getContactPage();
    expect(withheld).not.toHaveProperty("photo");
    expect(withheld.heading).toBe("Contacto");

    const granted = await content({
      ...pending,
      media: {
        ...pending.media,
        rights: [
          {
            sourceId: "contact-pending-source",
            people: "none",
            consent: "not-required",
          },
        ],
      },
    }).getContactPage();
    expect(granted.photo?.src).toBe(path);
  });

  it("returns the contact page and the coming-soon page of the requested slug", async () => {
    const reader = content();

    expect((await reader.getContactPage()).heading).toBe("Contacto");
    expect((await reader.getComingSoonPage("intensivos")).title).toBe(
      "Intensivos",
    );
    expect((await reader.getComingSoonPage("talleres")).title).toBe("Talleres");
  });

  it("lists unapproved content for the launch checklist", async () => {
    const base = buildRawSiteContent();
    const unapproved = await content({
      ...base,
      about: {
        ...base.about,
        history: [{ id: "history-1", approved: false, text: "h" }],
      },
    }).listUnapprovedContent();

    expect(unapproved).toEqual([{ id: "history-1", area: "about:history" }]);
    expect(await content().listUnapprovedContent()).toEqual([]);
  });

  it("getLaunchGate splits kinds", async () => {
    const base = buildRawSiteContent();
    const font = {
      id: "font-a",
      path: "/fonts/a.woff2",
      kind: "font",
      source: "test",
      licence: "test",
      replaceWith: "test",
    } as const;

    const gate = await content({
      ...base,
      standIns: [...base.standIns, font],
    }).getLaunchGate();

    expect(gate.fontStandIns).toEqual([font]);
    expect(gate.imageStandIns).toEqual(base.standIns);
    expect(gate.unpublishedMedia).toEqual([]);
  });

  it("lists the stand-in manifest, whose length is the launch gate", async () => {
    const base = buildRawSiteContent();

    const standIns = await content().listStandInAssets();

    expect(standIns).toEqual(base.standIns);
    expect(standIns.length).toBeGreaterThan(0);
  });

  it("answers every reader asynchronously", () => {
    const reader = content();

    for (const pending of [
      reader.getBusinessProfile(),
      reader.getHomePage(),
      reader.getAboutPage(),
      reader.getContactPage(),
      reader.getLaunchGate(),
      reader.getComingSoonPage("talleres"),
      reader.listUnapprovedContent(),
      reader.listStandInAssets(),
    ]) {
      expect(pending).toBeInstanceOf(Promise);
    }
  });

  it("changes its output when the source changes, with no other change", async () => {
    const base = buildRawSiteContent();
    const other = {
      ...base,
      contact: { ...base.contact, heading: "Escribinos" },
    };

    expect((await content(base).getContactPage()).heading).toBe("Contacto");
    expect((await content(other).getContactPage()).heading).toBe("Escribinos");
  });

  it("loads from its source on every call, assuming no cache", async () => {
    const base = buildRawSiteContent();
    let loads = 0;
    const reader = createSiteContent({
      load() {
        loads += 1;
        return Promise.resolve(base);
      },
    });

    await reader.getContactPage();
    await reader.getHomePage();

    expect(loads).toBe(2);
  });
});
