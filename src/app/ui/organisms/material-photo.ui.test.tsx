import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { MaterialPhoto } from "./material-photo";

const image = {
  src: "/media/arcilla.webp",
  alt: "Arcilla blanca",
  width: 800,
  height: 600,
  srcSet: "/media/arcilla-480.webp 480w, /media/arcilla.webp 800w",
};

function setup() {
  const view = render(<MaterialPhoto image={image} name="Arcilla" />);
  const dialog = view.container.querySelector("dialog") as HTMLDialogElement;
  return { ...view, dialog };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MaterialPhoto", () => {
  it("leads with a large photo that is a real button named for the product", () => {
    const { container } = setup();
    const button = screen.getByRole("button", {
      name: "Ver la foto de Arcilla en pantalla completa",
    });
    expect(button).toHaveClass("w-full");
    expect(container.querySelector("button img")).toHaveClass("aspect-4/3");
  });

  it("opens a modal dialog with the full photo and a close button on tap", () => {
    const { dialog } = setup();
    expect(dialog.open).toBe(false);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ver la foto de Arcilla en pantalla completa",
      }),
    );
    expect(dialog.open).toBe(true);
    const large = dialog.querySelector("img") as HTMLImageElement;
    expect(large).toHaveAttribute("srcset", image.srcSet);
    expect(large).toHaveAttribute("alt", "Arcilla blanca");
    expect(screen.getByRole("button", { name: "Cerrar foto" })).toHaveClass(
      "size-11",
    );
  });

  it("opens with showModal so the browser traps focus and closes on Escape", () => {
    const { dialog } = setup();
    const showModal = vi.fn(() => {
      dialog.setAttribute("open", "");
    });
    dialog.showModal = showModal;
    fireEvent.click(screen.getByRole("button", { name: /Ver la foto/ }));
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("closes with the close button", () => {
    const { dialog } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Ver la foto/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar foto" }));
    expect(dialog.open).toBe(false);
  });

  it("closes when the backdrop is tapped but not when the photo is", () => {
    const { dialog } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Ver la foto/ }));
    fireEvent.click(dialog.querySelector("img") as HTMLImageElement);
    expect(dialog.open).toBe(true);
    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
  });

  it("pushes a history entry on open so the back button closes the photo", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { dialog } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Ver la foto/ }));
    expect(push).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(dialog.open).toBe(false);
  });

  it("goes back one entry when closed by hand, so the stack stays clean", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Ver la foto/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar foto" }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does not go back again after the back button already closed it", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole("button", { name: /Ver la foto/ }));
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(back).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = setup();
    await expectNoAxeViolations(container);
  });
});
