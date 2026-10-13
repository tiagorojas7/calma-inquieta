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

  it("has no axe violations with the dialog open", async () => {
    const { container, thumbnail } = setup();
    await userEvent.click(thumbnail(first.alt));
    await expectNoAxeViolations(container);
  });
});
