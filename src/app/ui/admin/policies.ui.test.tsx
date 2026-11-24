import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { AdminPolicies, type PolicySectionView } from "./policies";

const sections: readonly PolicySectionView[] = [
  {
    kind: "conditions",
    title: "Condiciones",
    description: "Lo que aceptan quienes se inscriben.",
    currentVersion: 2,
    body: "Condiciones vigentes.",
    history: [
      {
        version: 2,
        label: "Versión 2",
        publishedOn: "10/11/2026",
        publishedBy: "duena@example.com",
        body: "Condiciones vigentes.",
        current: true,
      },
      {
        version: 1,
        label: "Versión 1",
        publishedOn: "01/11/2026",
        publishedBy: "migration 0018",
        body: "Primera versión.\n\nSegundo párrafo.",
        current: false,
      },
    ],
  },
  {
    kind: "privacy",
    title: "Privacidad",
    description: "Cómo usamos los datos.",
    currentVersion: 1,
    body: "Usamos tus datos solo para tu inscripción.",
    history: [
      {
        version: 1,
        label: "Versión 1",
        publishedOn: "01/11/2026",
        publishedBy: "migration 0018",
        body: "Usamos tus datos solo para tu inscripción.",
        current: true,
      },
    ],
  },
];

describe("AdminPolicies", () => {
  it("has one section per document, each a native post form prefilled with the current text", async () => {
    const { container } = render(
      <AdminPolicies
        sections={sections}
        feedback={null}
        rejected={undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Políticas" }),
    ).toBeVisible();
    for (const [index, title] of ["Condiciones", "Privacidad"].entries()) {
      const section = screen.getByRole("region", { name: title });
      const form = section.querySelector("form");
      expect(form).toHaveAttribute("method", "post");
      expect(form?.querySelector('input[name="kind"]')).toHaveValue(
        sections[index]?.kind,
      );
      expect(within(section).getByRole("textbox")).toHaveValue(
        sections[index]?.body,
      );
      expect(
        within(section).getByRole("button", { name: "Publicar nueva versión" }),
      ).toBeVisible();
    }
    await expectNoAxeViolations(container);
  });

  it("lists each version with its date and who published it, the text readable in a details", () => {
    render(
      <AdminPolicies
        sections={sections}
        feedback={null}
        rejected={undefined}
      />,
    );
    const section = screen.getByRole("region", { name: "Condiciones" });
    const items = within(section).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Versión 2");
    expect(items[0]).toHaveTextContent("10/11/2026");
    expect(items[0]).toHaveTextContent("duena@example.com");
    expect(items[1]).toHaveTextContent("Versión 1");
    const details = items[1]?.querySelector("details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("Primera versión.");
    expect(details).toHaveTextContent("Segundo párrafo.");
  });

  it("names the seeded first version as the base text instead of the migration", () => {
    render(
      <AdminPolicies
        sections={sections}
        feedback={null}
        rejected={undefined}
      />,
    );
    const section = screen.getByRole("region", { name: "Condiciones" });
    const seeded = within(section).getAllByRole("listitem")[1];

    expect(seeded).toHaveTextContent("Texto base inicial");
    expect(seeded).not.toHaveTextContent("migration 0018");
  });

  it("shows the success title for a published version", () => {
    render(
      <AdminPolicies
        sections={sections}
        feedback="published"
        rejected={undefined}
      />,
    );
    expect(screen.getByText("Nueva versión publicada")).toBeVisible();
  });

  it("keeps the typed text and shows the message only in the section that was refused", () => {
    render(
      <AdminPolicies
        sections={sections}
        feedback={null}
        rejected={{
          kind: "privacy",
          body: "Texto a medio escribir",
          message: "Completá este campo.",
        }}
      />,
    );
    const privacy = screen.getByRole("region", { name: "Privacidad" });
    expect(within(privacy).getByRole("textbox")).toHaveValue(
      "Texto a medio escribir",
    );
    expect(within(privacy).getByText("Completá este campo.")).toBeVisible();
    const conditions = screen.getByRole("region", { name: "Condiciones" });
    expect(within(conditions).getByRole("textbox")).toHaveValue(
      "Condiciones vigentes.",
    );
    expect(within(conditions).queryByText("Completá este campo.")).toBeNull();
  });

  it("uses only plain anchors and native forms", () => {
    const { container } = render(
      <AdminPolicies
        sections={sections}
        feedback={null}
        rejected={undefined}
      />,
    );
    expect(container.querySelector("button[formaction]")).toBeNull();
    expect(container.querySelectorAll("form")).toHaveLength(2);
  });
});
