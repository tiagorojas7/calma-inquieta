import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { createSiteContent } from "~/modules/site-content";
import type { AppServices } from "~/composition/request-services";
import { createTestServices } from "~/testing/fakes/app-services";
import {
  buildRawSiteContent,
  createInMemorySiteContentSource,
} from "~/testing/fakes/in-memory-site-content-source";
import { createLoaderArgs } from "~/testing/react-router";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import ContactRoute, { loader } from "./contact";

function renderContact(services: AppServices = createTestServices()) {
  const Stub = createRoutesStub([
    {
      path: "/contacto",
      Component: () => (
        <main>
          <ContactRoute />
        </main>
      ),
      loader: () => loader(createLoaderArgs(services, "/contacto") as never),
    },
  ]);
  return render(<Stub initialEntries={["/contacto"]} />);
}

function servicesWith(whatsapp: { display: string; provisional: boolean }) {
  const raw = buildRawSiteContent();
  return createTestServices({
    siteContent: createSiteContent(
      createInMemorySiteContentSource({
        ...raw,
        profile: { ...raw.profile, whatsapp },
      }),
    ),
  });
}

describe("Contacto route", () => {
  it("renders the directions link, the WhatsApp link and no form or embed", async () => {
    const { container } = renderContact();
    expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(1);
    const directions = screen.getByRole("link", { name: /Cómo llegar/ });
    expect(directions).toHaveAttribute(
      "href",
      expect.stringMatching(
        /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=Calle%20Falsa/,
      ),
    );
    expect(directions).toHaveAttribute("rel", "noopener noreferrer");
    expect(directions).toHaveAttribute("target", "_blank");
    expect(directions).toHaveAccessibleName(
      /^Cómo llegar\s*\(se abre en una pestaña nueva\)$/,
    );
    const whatsapp = container.querySelector('a[href^="https://wa.me/"]');
    expect(whatsapp).not.toBeNull();
    expect(whatsapp?.getAttribute("href")).toContain(
      `text=${encodeURIComponent("Hola, quiero hacer una consulta.")}`,
    );
    expect(
      screen.getByRole("link", { name: "@calma.inquieta" }),
    ).toHaveAttribute("href", "https://www.instagram.com/calma.inquieta/");
    expect(
      screen.getByText("Calle Falsa 123, Argüello, Córdoba"),
    ).toBeVisible();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).not.toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("prints no WhatsApp digits and no hours or email by default", async () => {
    const { container } = renderContact();
    await screen.findByRole("heading", { level: 1 });
    expect(container.textContent).not.toContain("351 000 0000");
    expect(container.textContent.replace(/\D/g, "")).not.toContain(
      "3510000000",
    );
    expect(screen.queryByText("Horarios")).not.toBeInTheDocument();
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("prints the number when it is not provisional", async () => {
    renderContact(
      servicesWith({ display: "351 000 0000", provisional: false }),
    );
    expect(await screen.findByText("351 000 0000")).toBeVisible();
  });
});

describe("Contacto route photo", () => {
  it("the photo is lazy with width, height and non-empty alt", async () => {
    renderContact();
    const photo = await screen.findByRole("img", { name: "Frente del local" });
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).not.toHaveAttribute("fetchpriority", "high");
    expect(photo).toHaveAttribute("width", "100");
    expect(photo).toHaveAttribute("height", "100");
    expect(photo.getAttribute("alt")?.trim()).not.toBe("");
  });

  it("the page keeps its required items and has no form or embed with the photo", async () => {
    const { container } = renderContact();
    await screen.findByRole("img", { name: "Frente del local" });
    expect(screen.getByRole("link", { name: /Cómo llegar/ })).toBeVisible();
    expect(
      screen.getByText("Calle Falsa 123, Argüello, Córdoba"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "@calma.inquieta" })).toBeVisible();
    expect(container.querySelector('a[href^="https://wa.me/"]')).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    await expectNoAxeViolations(container, { page: true });
  });

  it("the page is a full-bleed sand band whose photo is warmed and bleeds", async () => {
    const { container } = renderContact();
    await screen.findByRole("img", { name: "Frente del local" });
    const band = container.querySelector("main > section");
    expect(band).toHaveAttribute("data-tone", "sand");
    expect(band).toHaveAttribute("data-bleed", "true");
    expect(container.querySelector("[data-photo-bleed]")).not.toBeNull();
    expect(container.querySelector("[data-warm-overlay]")).not.toBeNull();
  });

  it("the photo box reserves its aspect ratio", async () => {
    renderContact();
    const photo = await screen.findByRole("img", { name: "Frente del local" });
    expect(photo.style.aspectRatio).toBe("100 / 100");
  });

  it("a withheld photo leaves no image and the contact details render", async () => {
    const raw = buildRawSiteContent();
    const { seo, heading, intro } = raw.contact;
    const { container } = renderContact(
      createTestServices({
        siteContent: createSiteContent(
          createInMemorySiteContentSource({
            ...raw,
            contact: { seo, heading, intro },
          }),
        ),
      }),
    );
    expect(await screen.findAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: /Cómo llegar/ })).toBeVisible();
  });
});
