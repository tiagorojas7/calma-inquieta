import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { ImageField, type ImageFieldUpload } from "./image-field";

const stored = { id: "i1", src: "/imagenes/i1.webp", width: 10, height: 5 };
const photo = new File(["x"], "foto.jpg", { type: "image/jpeg" });

function renderField(upload: ImageFieldUpload) {
  return render(<ImageField name="photo" label="Foto" upload={upload} />);
}

describe("ImageField", () => {
  it("accepts only the three allowed types", () => {
    renderField(() => Promise.resolve({ ok: true, image: stored }));
    expect(screen.getByLabelText("Foto")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
  });

  it("uploads the chosen file, previews it and asks for alt text", async () => {
    const upload = vi.fn<ImageFieldUpload>(() =>
      Promise.resolve({ ok: true, image: stored }),
    );
    const { container } = renderField(upload);
    await userEvent.upload(screen.getByLabelText("Foto"), photo);
    await waitFor(() => {
      expect(screen.getByRole("img")).toHaveAttribute("src", stored.src);
    });
    expect(upload).toHaveBeenCalledWith(photo);
    expect(container.querySelector('input[name="photoAssetId"]')).toHaveValue(
      "i1",
    );
    expect(container.querySelector('input[name="photoSrc"]')).toHaveValue(
      stored.src,
    );
    expect(screen.getByLabelText("Texto alternativo")).toHaveAttribute(
      "name",
      "photoAlt",
    );
    await expectNoAxeViolations(container);
  });

  it.each([
    ["too-large", "La imagen es demasiado grande."],
    ["unsupported-format", "Formato no admitido."],
    ["unavailable", "La subida de imágenes no está disponible por ahora."],
    ["failed", "No se pudo subir la imagen. Probá de nuevo."],
  ] as const)("shows the %s error and keeps no asset", async (error, text) => {
    const { container } = renderField(() =>
      Promise.resolve({ ok: false, error }),
    );
    await userEvent.upload(screen.getByLabelText("Foto"), photo);
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(container.querySelector('input[name="photoAssetId"]')).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("starts with the current image when one is given", () => {
    render(
      <ImageField
        name="photo"
        label="Foto"
        upload={() => Promise.resolve({ ok: true, image: stored })}
        current={{ assetId: "i0", src: "/imagenes/i0.webp", alt: "Sala" }}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "/imagenes/i0.webp");
    expect(screen.getByLabelText("Texto alternativo")).toHaveValue("Sala");
  });
});
