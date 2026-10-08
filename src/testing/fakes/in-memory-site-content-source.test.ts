import { describe, expect, it } from "vitest";
import { validateSiteContent } from "~/modules/site-content/domain/content-rules";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "./in-memory-site-content-source";

describe("buildRawSiteContent", () => {
  it("returns minimal content that passes every validation rule", () => {
    expect(validateSiteContent(buildRawSiteContent())).toEqual([]);
  });

  it("uses the fake WhatsApp number, never the client's", () => {
    expect(buildRawSiteContent().profile.whatsapp).toEqual({
      display: "351 000 0000",
      provisional: true,
    });
  });

  it("merges overrides over the defaults", () => {
    const base = buildRawSiteContent();

    const content = buildRawSiteContent({
      contact: { ...base.contact, heading: "Otro encabezado" },
    });

    expect(content.contact.heading).toBe("Otro encabezado");
    expect(content.home).toEqual(base.home);
  });
});

describe("createInMemorySiteContentSource", () => {
  it("loads the object it was given", async () => {
    const raw = buildRawSiteContent();

    await expect(createInMemorySiteContentSource(raw).load()).resolves.toBe(
      raw,
    );
  });
});
