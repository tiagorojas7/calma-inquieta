import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ContactSection } from "./contact-section";

const photo = {
  src: "/media/contact/f.webp",
  alt: "Frente del local",
  width: 480,
  height: 640,
} as const;

function setup(withPhoto = true) {
  return render(
    <main>
      <ContactSection
        heading="Contacto"
        intro="Escribinos."
        photo={withPhoto ? photo : undefined}
        directionsHref="https://example.test/ruta"
        items={[
          { id: "address", icon: "pin", label: "Dirección", value: "Calle 1" },
          {
            id: "ig",
            icon: "instagram",
            label: "Instagram",
            value: "@ci",
            href: "https://instagram.test/ci",
          },
        ]}
      />
    </main>,
  );
}

describe("ContactSection", () => {
  it("is a full-bleed sand band, a direct child of main", async () => {
    const { container } = setup();
    const band = container.querySelector("main > section");
    expect(band).toHaveAttribute("data-tone", "sand");
    expect(band).toHaveAttribute("data-bleed", "true");
    await expectNoAxeViolations(container, { page: true });
  });

  it("lets the photo bleed to the right page edge on desktop", () => {
    const { container } = setup();
    const bleed = container.querySelector("[data-photo-bleed]");
    expect(bleed).not.toBeNull();
    expect(bleed?.className).toMatch(/lg:/);
    expect(bleed?.contains(screen.getByRole("img", { name: photo.alt }))).toBe(
      true,
    );
  });

  it("softens the dark photo with a warm overlay and never prints text on it", () => {
    const { container } = setup();
    const bleed = container.querySelector("[data-photo-bleed]") as HTMLElement;
    const overlay = bleed.querySelector("[data-warm-overlay]");
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(bleed.textContent.trim()).toBe("");
  });

  it("decorates the photo with a sprig and a butterfly", () => {
    const { container } = setup();
    const bleed = container.querySelector("[data-photo-bleed]") as HTMLElement;
    expect(
      bleed.querySelectorAll('[aria-hidden="true"] svg').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("puts the info before the photo in reading order", () => {
    const { container } = setup();
    const heading = screen.getByRole("heading", { level: 1 });
    const img = container.querySelector("img") as HTMLElement;
    expect(
      heading.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the details and the directions link without a photo", () => {
    const { container } = setup(false);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-photo-bleed]")).toBeNull();
    expect(screen.getByRole("link", { name: /Cómo llegar/ })).toBeVisible();
    expect(screen.getByText("Calle 1")).toBeVisible();
  });
});
