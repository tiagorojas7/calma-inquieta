import { describe, expect, it } from "vitest";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "~/testing/fakes/in-memory-site-content-source";
import type { MediaRegistry, RightsEntry } from "../domain/media";
import type { AmbientLoop, RawSiteContent } from "../domain/page-content";
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

  it("getHomePage returns the hero backdrop, collage, note and keywords", async () => {
    const base = buildRawSiteContent();
    const home = await content(base).getHomePage();

    expect(home.hero.backdrop).toEqual(base.home.hero.backdrop);
    expect(home.hero.collage).toEqual(base.home.hero.collage);
    expect(home.hero.note).toBe(base.home.hero.note);
    expect(home.hero.keywords).toEqual(base.home.hero.keywords);
    expect(home.hero.backdrop.src).not.toBe("");
    expect(home.hero.collage.length).toBeGreaterThanOrEqual(3);
    expect(home.hero).not.toHaveProperty("image");
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

  it("getAboutPage drops an intro image whose asset is pending", async () => {
    const base = buildRawSiteContent();
    const path = "/media/about/about-intro-pending-480.0a1b2c3d.webp";
    const about = await content({
      ...base,
      about: {
        ...base.about,
        introImages: [
          ...base.about.introImages,
          { src: path, alt: "Una mesa", width: 480, height: 640 },
        ],
      },
      media: {
        assets: [
          {
            kind: "image",
            id: "about-intro-pending",
            sourceId: "about-intro-pending-source",
            area: "about",
            alt: "Una mesa",
            format: "webp",
            variants: [{ width: 480, height: 640, path }],
          },
        ],
        rights: [
          {
            sourceId: "about-intro-pending-source",
            people: "faces",
            consent: "pending",
          },
        ],
        excluded: [],
      },
    }).getAboutPage();

    expect(about.introImages).toEqual(base.about.introImages);
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

  it("getBrand returns the published logos and drops an unpublishable one", async () => {
    const base = buildRawSiteContent();
    expect(await content(base).getBrand()).toEqual(base.brand);

    const path = "/media/brand/brand-logo-pending-56.0a1b2c3d.webp";
    const pending = {
      ...base,
      brand: {
        ...base.brand,
        logoLight: { src: path, alt: "", width: 56, height: 59 },
      },
      media: {
        ...base.media,
        assets: [
          ...base.media.assets,
          {
            kind: "image",
            id: "brand-logo-pending",
            sourceId: "brand-pending-source",
            area: "brand",
            alt: "",
            decorative: true,
            format: "webp",
            variants: [{ width: 56, height: 59, path }],
          },
        ],
      },
    } satisfies RawSiteContent;

    const withheld = await content(pending).getBrand();
    expect(withheld.logo).toEqual(base.brand.logo);
    expect(withheld).not.toHaveProperty("logoLight");
  });

  it("returns the contact page and the coming-soon page of the requested slug", async () => {
    const reader = content();

    expect((await reader.getContactPage()).heading).toBe("Contacto");
    expect((await reader.getComingSoonPage("eventos-privados")).title).toBe(
      "Eventos privados",
    );
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
      reader.getComingSoonPage("eventos-privados"),
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

describe("createSiteContent ambient loop", () => {
  const webm = "/media/video/home-loop-720.0a1b2c3d.webm";
  const mp4 = "/media/video/home-loop-720.0a1b2c3d.mp4";
  const poster = "/media/video/home-loop-poster-720.0a1b2c3d.webp";
  const loop: AmbientLoop = {
    poster: { src: poster, alt: "", width: 720, height: 900 },
    sources: [
      { src: webm, type: "video/webm" },
      { src: mp4, type: "video/mp4" },
    ],
    width: 720,
    height: 900,
  };
  const registry = (consent: RightsEntry): MediaRegistry => {
    const share = buildRawSiteContent().media;
    return {
      assets: [
        ...share.assets.filter(({ area }) => area === "share"),
        {
          kind: "image",
          id: "home-loop-poster",
          sourceId: "loop-source",
          area: "video",
          alt: "",
          decorative: true,
          format: "webp",
          variants: [{ width: 720, height: 900, path: poster }],
        },
        {
          kind: "video",
          id: "home-loop",
          sourceId: "loop-source",
          area: "video",
          width: 720,
          height: 900,
          durationSeconds: 6,
          audio: false,
          sources: [
            { path: webm, type: "video/webm" },
            { path: mp4, type: "video/mp4" },
          ],
          posterId: "home-loop-poster",
        },
      ],
      rights: [
        ...share.rights.filter(
          ({ sourceId }) => sourceId === "test-share-source",
        ),
        consent,
      ],
      excluded: [],
    };
  };
  const withLoop = (consent: RightsEntry): RawSiteContent => {
    const base = buildRawSiteContent();
    return {
      ...base,
      home: { ...base.home, hero: { ...base.home.hero, loop } },
      media: registry(consent),
    };
  };

  it("getHomePage keeps a published loop", async () => {
    const home = await content(
      withLoop({
        sourceId: "loop-source",
        people: "none",
        consent: "not-required",
      }),
    ).getHomePage();

    expect(home.hero.loop).toEqual(loop);
  });

  it("getHomePage drops the loop when an asset is unpublishable and still returns the hero", async () => {
    const raw = withLoop({
      sourceId: "loop-source",
      people: "faces",
      consent: "pending",
    });
    const home = await content(raw).getHomePage();

    expect(home.hero).not.toHaveProperty("loop");
    expect(home.hero.backdrop).toEqual(raw.home.hero.backdrop);
    expect(home.hero.collage).toEqual(raw.home.hero.collage);
    expect(home.hero.eyebrow).toBe(raw.home.hero.eyebrow);
    expect(home.hero.title).toEqual(raw.home.hero.title);
  });

  it("getAboutPage keeps the published intro loops and drops an unpublished one", async () => {
    const raw = withLoop({
      sourceId: "loop-source",
      people: "none",
      consent: "not-required",
    });
    const stray: AmbientLoop = {
      ...loop,
      sources: [
        { src: "/media/video/stray-360.0a1b2c3d.mp4", type: "video/mp4" },
      ],
    };
    const about = await content({
      ...raw,
      about: { ...raw.about, introLoops: [loop, stray] },
    }).getAboutPage();

    expect(about.introLoops).toEqual([loop]);
  });

  it("getAboutPage returns no intro loops when none is published, keeping the photos", async () => {
    const raw = withLoop({
      sourceId: "loop-source",
      people: "faces",
      consent: "pending",
    });
    const about = await content({
      ...raw,
      about: { ...raw.about, introLoops: [loop] },
    }).getAboutPage();

    expect(about.introLoops).toEqual([]);
    expect(about.introImages).toEqual(raw.about.introImages);
  });

  it("getHomePage drops a loop with a single unpublishable source", async () => {
    const raw = withLoop({
      sourceId: "loop-source",
      people: "none",
      consent: "not-required",
    });
    const home = await content({
      ...raw,
      home: {
        ...raw.home,
        hero: {
          ...raw.home.hero,
          loop: {
            ...loop,
            sources: [
              ...loop.sources,
              { src: "/media/video/other-720.0a1b2c3d.mp4", type: "video/mp4" },
            ],
          },
        },
      },
    }).getHomePage();

    expect(home.hero).not.toHaveProperty("loop");
  });

  it("getHomePage returns a hero without a loop untouched", async () => {
    const raw = buildRawSiteContent();

    expect((await content(raw).getHomePage()).hero).toEqual(raw.home.hero);
  });
});
