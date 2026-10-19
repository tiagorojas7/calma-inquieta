import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { galleryImageFixtures } from "~/testing/fixtures/ui";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { GalleryGrid } from "./gallery-grid";

const [first, second, third] = galleryImageFixtures;

function setup() {
  const view = render(
    <GalleryGrid heading="Un vistazo" images={galleryImageFixtures} />,
  );
  const thumbnail = (alt: string) => screen.getByRole("button", { name: alt });
  const dialog = () => screen.getByRole("dialog");
  return { ...view, thumbnail, dialog };
}

describe("GalleryGrid", () => {
  it("renders each thumbnail as a button wrapping an image with alt text", () => {
    setup();
    for (const image of galleryImageFixtures) {
      const button = screen.getByRole("button", { name: image.alt });
      expect(within(button).getByRole("img")).toHaveAttribute("alt", image.alt);
    }
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a named dialog with the activated image and a visible caption", async () => {
    const { thumbnail, dialog } = setup();
    await userEvent.click(thumbnail(first.alt));
    const open = dialog();
    expect(within(open).getByRole("img", { name: first.alt })).toBeVisible();
    expect(open).toHaveAccessibleName(first.alt);
    const labelledBy = open.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy ?? "")).toBeVisible();
  });

  it("offers Close, Previous and Next controls with microcopy labels", async () => {
    const { thumbnail, dialog } = setup();
    await userEvent.click(thumbnail(first.alt));
    const open = within(dialog());
    expect(open.getByRole("button", { name: "Cerrar" })).toBeVisible();
    expect(open.getByRole("button", { name: "Anterior" })).toBeVisible();
    expect(open.getByRole("button", { name: "Siguiente" })).toBeVisible();
  });

  it("navigates with ArrowRight and ArrowLeft", async () => {
    const { thumbnail, dialog } = setup();
    await userEvent.click(thumbnail(first.alt));
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(
      within(dialog()).getByRole("img", { name: second.alt }),
    ).toBeVisible();
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    expect(
      within(dialog()).getByRole("img", { name: first.alt }),
    ).toBeVisible();
  });

  it("wraps around at both edges", async () => {
    const { thumbnail, dialog } = setup();
    await userEvent.click(thumbnail(third.alt));
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Siguiente" }),
    );
    expect(
      within(dialog()).getByRole("img", { name: first.alt }),
    ).toBeVisible();
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Anterior" }),
    );
    expect(
      within(dialog()).getByRole("img", { name: third.alt }),
    ).toBeVisible();
  });

  it("closes on Escape and returns focus to the activating thumbnail", async () => {
    const { thumbnail, dialog } = setup();
    await userEvent.click(thumbnail(second.alt));
    fireEvent(dialog(), new Event("cancel", { cancelable: true }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(thumbnail(second.alt)).toHaveFocus();
  });

  it("closes with the Close button", async () => {
    const { thumbnail, dialog } = setup();
    await userEvent.click(thumbnail(first.alt));
    await userEvent.click(
      within(dialog()).getByRole("button", { name: "Cerrar" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(thumbnail(first.alt)).toHaveFocus();
  });

  it("renders nothing for an empty gallery", () => {
    const { container } = render(
      <GalleryGrid heading="Un vistazo" images={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders only the grid and the dialog when the heading is omitted", async () => {
    const { container } = render(<GalleryGrid images={galleryImageFixtures} />);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelector("section")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(
      galleryImageFixtures.length,
    );
    expect(container.querySelector("dialog")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: first.alt }));
    expect(
      within(screen.getByRole("dialog")).getByRole("img", { name: first.alt }),
    ).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it("has no axe violations with the dialog open", async () => {
    const { container, thumbnail } = setup();
    await userEvent.click(thumbnail(first.alt));
    await expectNoAxeViolations(container);
  });
});

describe("GalleryGrid responsive images", () => {
  const THUMBNAIL_SIZES =
    "(min-width: 90rem) 28rem, (min-width: 48rem) 31vw, 46vw";
  const LIGHTBOX_SIZES = "(min-width: 48rem) 46rem, 100vw";
  const responsive = [
    {
      ...first,
      srcSet:
        "/media/about/a-480.0a1b2c3d.webp 480w, /media/about/a-960.1b2c3d4e.webp 960w",
    },
    { ...second, srcSet: "/media/about/b-480.2c3d4e5f.webp 480w" },
  ] as const;

  it("thumbnails carry srcset and the thumbnail sizes", () => {
    render(<GalleryGrid images={responsive} />);
    for (const image of responsive) {
      const thumbnail = within(
        screen.getByRole("button", { name: image.alt }),
      ).getByRole("img");
      expect(thumbnail).toHaveAttribute("srcset", image.srcSet);
      expect(thumbnail).toHaveAttribute("sizes", THUMBNAIL_SIZES);
    }
  });

  it("the lightbox uses the largest variant with the lightbox sizes", async () => {
    render(<GalleryGrid images={responsive} />);
    await userEvent.click(screen.getByRole("button", { name: first.alt }));
    const shown = within(screen.getByRole("dialog")).getByRole("img", {
      name: first.alt,
    });
    expect(shown).toHaveAttribute("srcset", responsive[0].srcSet);
    expect(shown).toHaveAttribute("sizes", LIGHTBOX_SIZES);
    expect(shown).toHaveAttribute("src", first.src);
  });

  it("entries without srcSet keep rendering", async () => {
    render(<GalleryGrid images={galleryImageFixtures} />);
    const thumbnail = within(
      screen.getByRole("button", { name: first.alt }),
    ).getByRole("img");
    expect(thumbnail).toHaveAttribute("src", first.src);
    expect(thumbnail).not.toHaveAttribute("srcset");
    await userEvent.click(screen.getByRole("button", { name: first.alt }));
    const shown = within(screen.getByRole("dialog")).getByRole("img", {
      name: first.alt,
    });
    expect(shown).toHaveAttribute("src", first.src);
    expect(shown).not.toHaveAttribute("srcset");
  });
});
