import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import type { ProjectMaterialChoice } from "./intensive-project-materials";
import {
  NewProjectBlocks,
  type NewProjectBlockValues,
} from "./intensive-new-projects";

const blank: NewProjectBlockValues = {
  name: "",
  price: "",
  deposit: "",
  description: "",
  image: null,
  materials: [],
};
const choices: readonly ProjectMaterialChoice[] = [
  {
    variantId: "v-arcilla",
    name: "Arcilla blanca",
    label: "5 kg",
    onHand: 7,
    keptInStudio: true,
  },
  {
    variantId: "v-esmalte",
    name: "Esmalte",
    label: "Celeste",
    onHand: 0,
    keptInStudio: false,
  },
  {
    variantId: "v-barniz",
    name: "Barniz",
    label: "1 L",
    onHand: 3,
    keptInStudio: false,
  },
];

function renderBlocks(
  props: Partial<Parameters<typeof NewProjectBlocks>[0]> = {},
) {
  return render(
    <form method="post">
      <NewProjectBlocks
        initial={[blank]}
        errors={{}}
        choices={choices}
        upload={() => Promise.resolve({ ok: false, error: "failed" })}
        {...props}
      />
    </form>,
  );
}

const field = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLInputElement>(`[name="${name}"]`);
const block = (n: number) =>
  screen.getByRole("group", { name: `Proyecto ${String(n)}` });

describe("NewProjectBlocks", () => {
  it("starts with one block whose fields carry its index, and offers no way to remove the last one", () => {
    const { container } = renderBlocks();

    for (const name of [
      "project0Name",
      "project0Price",
      "project0Deposit",
      "project0Description",
    ])
      expect(field(container, name)).not.toBeNull();
    expect(screen.getByText("Imagen del proyecto (opcional)")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^Quitar proyecto/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Agregar otro proyecto" }),
    ).toHaveAttribute("type", "button");
  });

  it("shows again every block with what was typed", () => {
    const { container } = renderBlocks({
      initial: [
        {
          ...blank,
          name: "Taza",
          price: "45000",
          deposit: "15000",
          description: "Una taza.",
        },
        { ...blank, name: "Plato" },
      ],
    });

    expect(field(container, "project0Name")?.value).toBe("Taza");
    expect(field(container, "project0Price")?.value).toBe("45000");
    expect(field(container, "project0Deposit")?.value).toBe("15000");
    expect(
      container.querySelector<HTMLTextAreaElement>(
        "textarea[name=project0Description]",
      )?.value,
    ).toBe("Una taza.");
    expect(field(container, "project1Name")?.value).toBe("Plato");
  });

  it("adds a block with the next index and then lets any block be removed", async () => {
    const user = userEvent.setup();
    const { container } = renderBlocks();

    await user.click(
      screen.getByRole("button", { name: "Agregar otro proyecto" }),
    );

    expect(field(container, "project1Name")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Quitar proyecto 1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Quitar proyecto 2" }),
    ).toBeVisible();
  });

  it("renumbers the blocks that remain and keeps what was typed in them", async () => {
    const user = userEvent.setup();
    const { container } = renderBlocks({
      initial: [
        { ...blank, name: "Taza" },
        { ...blank, name: "Plato" },
        { ...blank, name: "Cuenco" },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Quitar proyecto 1" }));

    expect(field(container, "project0Name")?.value).toBe("Plato");
    expect(field(container, "project1Name")?.value).toBe("Cuenco");
    expect(field(container, "project2Name")).toBeNull();
  });

  it("shows each message beside its own field, inside its own block", () => {
    renderBlocks({
      initial: [blank, blank],
      errors: {
        project0Name: "Completá este campo.",
        project1Deposit: "No puede superar el precio.",
        project1Image: "Describí la imagen en el texto alternativo.",
      },
    });

    expect(
      within(block(1)).getByText("Completá este campo."),
    ).toBeInTheDocument();
    expect(
      within(block(2)).queryByText("Completá este campo."),
    ).not.toBeInTheDocument();
    expect(
      within(block(2)).getByText("No puede superar el precio."),
    ).toBeInTheDocument();
    expect(
      within(block(2)).getByText("Describí la imagen en el texto alternativo."),
    ).toBeInTheDocument();
    expect(within(block(1)).getByLabelText("Seña (en pesos)")).toHaveAttribute(
      "name",
      "project0Deposit",
    );
  });

  it("drops the messages once a block is removed, because their numbers no longer match", async () => {
    const user = userEvent.setup();
    renderBlocks({
      initial: [blank, blank],
      errors: { project1Deposit: "No puede superar el precio." },
    });

    await user.click(screen.getByRole("button", { name: "Quitar proyecto 1" }));

    expect(
      screen.queryByText("No puede superar el precio."),
    ).not.toBeInTheDocument();
  });

  it("submits the image of a block under its own name, with its description", () => {
    const { container } = renderBlocks({
      initial: [
        {
          ...blank,
          image: { assetId: "img-1", src: "/imagenes/img-1.webp", alt: "Taza" },
        },
      ],
    });

    expect(field(container, "project0ImageAssetId")?.value).toBe("img-1");
    expect(field(container, "project0ImageSrc")?.value).toBe(
      "/imagenes/img-1.webp",
    );
    expect(field(container, "project0ImageAlt")?.value).toBe("Taza");
  });

  describe("the materials of a block", () => {
    it("shows the chosen materials again with their quantity as typed", () => {
      const { container } = renderBlocks({
        initial: [
          {
            ...blank,
            materials: [
              { variantId: "v-arcilla", quantity: "3" },
              { variantId: "v-esmalte", quantity: "0" },
            ],
          },
        ],
      });

      expect(field(container, "project0MaterialVariant0")?.value).toBe(
        "v-arcilla",
      );
      expect(field(container, "project0MaterialQuantity0")?.value).toBe("3");
      expect(field(container, "project0MaterialVariant1")?.value).toBe(
        "v-esmalte",
      );
      expect(field(container, "project0MaterialQuantity1")?.value).toBe("0");
    });

    it("says which are in stock and which are ordered, as the other pickers do", () => {
      renderBlocks({
        initial: [
          {
            ...blank,
            materials: [
              { variantId: "v-arcilla", quantity: "1" },
              { variantId: "v-esmalte", quantity: "1" },
            ],
          },
        ],
      });

      const list = screen.getByRole("group", {
        name: "Materiales del proyecto 1",
      });
      expect(within(list).getByText(/En stock: 7/)).toBeVisible();
      expect(within(list).getByText(/Se pide/)).toBeVisible();
    });

    it("names a material that left the catalog and still lets it be removed", async () => {
      const user = userEvent.setup();
      const { container } = renderBlocks({
        initial: [
          { ...blank, materials: [{ variantId: "v-gone", quantity: "1" }] },
        ],
      });

      expect(
        screen.getByText("Material no disponible en el catálogo"),
      ).toBeVisible();
      await user.click(
        screen.getByRole("button", {
          name: "Quitar Material no disponible en el catálogo",
        }),
      );
      expect(field(container, "project0MaterialVariant0")).toBeNull();
    });

    it("finds a material by searching, adds it with one unit and takes it out of the results", async () => {
      const user = userEvent.setup();
      const { container } = renderBlocks();

      await user.click(screen.getByText("Agregar material"));
      expect(
        screen.getByText("Escribí para buscar en el catálogo."),
      ).toBeVisible();
      await user.type(screen.getByLabelText("Buscar material"), "arcilla 5");
      await user.click(
        screen.getByRole("button", { name: "Agregar Arcilla blanca 5 kg" }),
      );

      expect(field(container, "project0MaterialVariant0")?.value).toBe(
        "v-arcilla",
      );
      expect(field(container, "project0MaterialQuantity0")?.value).toBe("1");
      expect(
        screen.queryByRole("button", { name: "Agregar Arcilla blanca 5 kg" }),
      ).toBeNull();
    });

    it("keeps adding to the end and renumbers the lines when one is removed", async () => {
      const user = userEvent.setup();
      const { container } = renderBlocks({
        initial: [
          {
            ...blank,
            materials: [
              { variantId: "v-arcilla", quantity: "2" },
              { variantId: "v-esmalte", quantity: "5" },
            ],
          },
        ],
      });

      await user.click(
        screen.getByRole("button", { name: "Quitar Arcilla blanca 5 kg" }),
      );

      expect(field(container, "project0MaterialVariant0")?.value).toBe(
        "v-esmalte",
      );
      expect(field(container, "project0MaterialQuantity0")?.value).toBe("5");
      expect(field(container, "project0MaterialVariant1")).toBeNull();
    });

    it("keeps the bill of each block apart", async () => {
      const user = userEvent.setup();
      const { container } = renderBlocks({ initial: [blank, blank] });

      await user.click(within(block(2)).getByText("Agregar material"));
      await user.type(
        within(block(2)).getByLabelText("Buscar material"),
        "barniz",
      );
      await user.click(
        within(block(2)).getByRole("button", { name: "Agregar Barniz 1 L" }),
      );

      expect(field(container, "project1MaterialVariant0")?.value).toBe(
        "v-barniz",
      );
      expect(field(container, "project0MaterialVariant0")).toBeNull();
    });

    it("does not submit the form when Enter is pressed in the search box", async () => {
      const user = userEvent.setup();
      renderBlocks();
      await user.click(screen.getByText("Agregar material"));

      const search = screen.getByLabelText("Buscar material");
      const allowed = fireEvent.keyDown(search, { key: "Enter" });

      expect(allowed).toBe(false);
    });

    it("shows the message of a refused line beside its own variant or quantity", () => {
      renderBlocks({
        initial: [
          {
            ...blank,
            materials: [
              { variantId: "v-arcilla", quantity: "0" },
              { variantId: "v-gone", quantity: "1" },
            ],
          },
        ],
        errors: {
          project0MaterialQuantity0:
            "La cantidad tiene que ser un número entero de 1 a 20.",
          project0MaterialVariant1:
            "Ese material no está disponible en el catálogo.",
        },
      });

      expect(
        screen.getByText(
          "La cantidad tiene que ser un número entero de 1 a 20.",
        ),
      ).toBeVisible();
      expect(
        screen.getByText("Ese material no está disponible en el catálogo."),
      ).toBeVisible();
    });

    it("says so when the catalog has nothing to add", async () => {
      const user = userEvent.setup();
      renderBlocks({ choices: [] });

      await user.click(screen.getByText("Agregar material"));

      expect(
        screen.getByText("No hay materiales en el catálogo para agregar."),
      ).toBeVisible();
    });
  });

  it("has no accessibility violations with two blocks, a bill and messages", async () => {
    const { container } = renderBlocks({
      initial: [
        {
          ...blank,
          materials: [{ variantId: "v-arcilla", quantity: "1" }],
        },
        blank,
      ],
      errors: { project1Name: "Completá este campo." },
    });

    await expectNoAxeViolations(container);
  });
});
