import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { WorkshopForm, WorkshopStatePanel } from "./workshop-form";

const values = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  technique: "",
  defaultFee: "",
  teacherId: "",
  percentage: "",
};

function stub(element: React.ReactElement) {
  const Stub = createRoutesStub([{ path: "/", Component: () => element }]);
  return render(<Stub />);
}

/** Records whether a submit reached the document (not cancelled by the router). */
function submitReachesBrowser(form: HTMLFormElement | null) {
  const seen: { prevented: boolean | null } = { prevented: null };
  const observe = (event: Event) => {
    seen.prevented = event.defaultPrevented;
    event.preventDefault(); // keep jsdom from attempting a real navigation
  };
  document.addEventListener("submit", observe);
  form?.requestSubmit();
  document.removeEventListener("submit", observe);
  return seen.prevented === false;
}

describe("WorkshopForm", () => {
  it("is a native post form with noValidate, so the submit is a document request", async () => {
    // Layer 1 (admin-gate) denies every /admin/**.data request, so a router
    // Form or fetcher submit would be refused even for an admin.
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );
    const form = (await screen.findByLabelText("Nombre")).closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form).toHaveAttribute("novalidate");
    expect(fireEvent.submit(form as HTMLFormElement)).toBe(true);
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/talleres",
    );
  });

  it("labels each teacher with her modality", async () => {
    stub(
      <WorkshopForm
        values={values}
        errors={{}}
        teachers={[{ id: "t2", name: "Beto Ruiz", modality: "third_party" }]}
        published={false}
        cancelHref="/admin/talleres"
      />,
    );
    expect(
      await screen.findByRole("option", { name: "Beto Ruiz (De terceros)" }),
    ).toBeVisible();
  });
});

describe("WorkshopStatePanel", () => {
  it("confirms before archiving and then posts the archive intent as a document", async () => {
    stub(
      <WorkshopStatePanel
        status="published"
        activeTurnos={1}
        error={undefined}
      />,
    );
    const archive = await screen.findByRole("button", { name: "Archivar" });
    const form = archive.closest("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.querySelector("input[name=intent]")).toHaveValue("archive");
    expect(screen.getByText("1 turno activo")).toBeVisible();

    await userEvent.click(archive);
    const dialog = screen.getByRole("dialog", { name: "¿Archivar el taller?" });
    expect(dialog).toBeVisible();

    const reached: { value: boolean } = { value: false };
    const observe = (event: Event) => {
      reached.value = !event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("submit", observe);
    const buttons = screen.getAllByRole("button", { name: "Archivar" });
    await userEvent.click(buttons[buttons.length - 1] as HTMLElement);
    document.removeEventListener("submit", observe);
    expect(reached.value).toBe(true);
  });

  it("offers the publish control as a plain post for a draft, with delete behind a confirmation", async () => {
    stub(
      <WorkshopStatePanel status="draft" activeTurnos={0} error={undefined} />,
    );
    const publish = await screen.findByRole("button", { name: "Publicar" });
    expect(
      publish.closest("form")?.querySelector("input[name=intent]"),
    ).toHaveValue("publish");
    expect(submitReachesBrowser(publish.closest("form"))).toBe(true);
    expect(
      screen.getByRole("button", { name: "Eliminar borrador" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
  });

  it("resumes a paused workshop and restores an archived one", () => {
    const { unmount } = render(
      <WorkshopStatePanel status="paused" activeTurnos={1} error={undefined} />,
    );
    expect(
      screen
        .getByRole("button", { name: "Volver a publicar" })
        .closest("form")
        ?.querySelector("input[name=intent]"),
    ).toHaveValue("publish");
    unmount();
    render(
      <WorkshopStatePanel status="archived" activeTurnos={0} error="Falló." />,
    );
    expect(
      screen
        .getByRole("button", { name: "Restaurar como borrador" })
        .closest("form")
        ?.querySelector("input[name=intent]"),
    ).toHaveValue("restore");
    expect(screen.getByText("Falló.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();
  });
});
