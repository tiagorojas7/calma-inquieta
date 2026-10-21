import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import AdminTurnos from "./turnos";

const EMPTY_VALUES = {
  label: "",
  weekday: "1",
  startsAt: "",
  endsAt: "",
  defaultCapacity: "",
};

const TURNOS = [
  {
    id: "t1",
    label: "Mañana",
    day: "Martes",
    range: "10:00 a 12:00",
    capacity: 8,
    active: true,
    usedByPeriods: true,
  },
  {
    id: "t2",
    label: "Tarde",
    day: "Jueves",
    range: "15:00 a 17:30",
    capacity: 6,
    active: true,
    usedByPeriods: false,
  },
  {
    id: "t3",
    label: "Noche",
    day: "Viernes",
    range: "19:00 a 21:00",
    capacity: 5,
    active: false,
    usedByPeriods: false,
  },
];

function required<T>(value: T | null | undefined, description: string): T {
  if (value == null) throw new Error(`${description} missing`);
  return value;
}

function stub(
  options: {
    editing?: { turnoId: string; values: typeof EMPTY_VALUES } | null;
    turnos?: typeof TURNOS;
    actionData?: unknown;
  } = {},
) {
  const Stub = createRoutesStub([
    {
      path: "/admin/talleres/:id/turnos",
      Component: AdminTurnos,
      action: () => null,
      id: "turnos",
    },
  ]);
  return (
    <Stub
      initialEntries={["/admin/talleres/w1/turnos"]}
      hydrationData={{
        loaderData: {
          turnos: {
            workshopId: "w1",
            workshopName: "Cerámica Creativa",
            turnos: options.turnos ?? TURNOS,
            editing: options.editing ?? null,
          },
        },
        ...(options.actionData
          ? { actionData: { turnos: options.actionData } }
          : {}),
      }}
    />
  );
}

describe("turnos admin screen", () => {
  it("lists each turno with its day, time range, capacity and state, with only the actions that apply", async () => {
    const { container } = render(stub());
    const table = await screen.findByRole("table", {
      name: "Turnos del taller",
    });
    const rows = within(table).getAllByRole("row");
    const morningRow = required(rows[1], "morning row");
    const afternoonRow = required(rows[2], "afternoon row");
    const nightRow = required(rows[3], "night row");
    expect(within(morningRow).getByText("Martes")).toBeVisible();
    expect(within(morningRow).getByText("10:00 a 12:00")).toBeVisible();
    expect(within(morningRow).getByText("8")).toBeVisible();
    expect(within(morningRow).getByText("Activo")).toBeVisible();
    expect(within(nightRow).getByText("Retirado")).toBeVisible();

    // A turno a period used cannot be deleted: only retire is offered.
    expect(
      within(morningRow).getByRole("button", { name: "Retirar Mañana" }),
    ).toBeVisible();
    expect(
      within(morningRow).queryByRole("button", { name: "Eliminar Mañana" }),
    ).toBeNull();
    expect(
      within(afternoonRow).getByRole("button", { name: "Eliminar Tarde" }),
    ).toBeVisible();
    // A retired turno is reactivated, not retired again.
    expect(
      within(nightRow).getByRole("button", { name: "Reactivar Noche" }),
    ).toBeVisible();
    expect(
      within(nightRow).queryByRole("button", { name: "Retirar Noche" }),
    ).toBeNull();

    // Native navigation only: a plain anchor to the same page in edit mode.
    expect(
      within(afternoonRow).getByRole("link", { name: "Editar Tarde" }),
    ).toHaveAttribute("href", "/admin/talleres/w1/turnos?editar=t2");
    expect(
      screen.getByRole("link", { name: "Volver al taller" }),
    ).toHaveAttribute("href", "/admin/talleres/w1");

    // Add form: a native post with the five fields and the capacity note.
    const addSection = required(
      screen.getByRole("heading", { name: "Agregar turno" }).closest("section"),
      "add turno section",
    );
    const form = required(addSection.querySelector("form"), "add turno form");
    expect(form).toHaveAttribute("method", "post");
    expect(within(form).getByLabelText("Nombre del turno")).toBeVisible();
    expect(within(form).getByLabelText("Día de la semana")).toBeVisible();
    expect(within(form).getByLabelText("Desde")).toBeVisible();
    expect(within(form).getByLabelText("Hasta")).toBeVisible();
    expect(within(form).getByLabelText("Capacidad por defecto")).toBeVisible();
    expect(
      screen.getByText(/Cambiarla no modifica los meses que ya abriste/),
    ).toBeVisible();
    expect(form.querySelector('input[name="turnoId"]')).toBeNull();
    await expectNoAxeViolations(container);
  });

  it("shows the empty state when the workshop has no turnos", async () => {
    render(stub({ turnos: [] }));
    expect(await screen.findByText("Todavía no hay turnos")).toBeVisible();
  });

  it("edit mode fills the form, keeps the turno id in a hidden field and offers to cancel", async () => {
    render(
      stub({
        editing: {
          turnoId: "t2",
          values: {
            label: "Tarde",
            weekday: "4",
            startsAt: "15:00",
            endsAt: "17:30",
            defaultCapacity: "6",
          },
        },
      }),
    );
    const heading = await screen.findByRole("heading", {
      name: "Editar turno",
    });
    const editSection = required(
      heading.closest("section"),
      "edit turno section",
    );
    const form = required(editSection.querySelector("form"), "edit turno form");
    expect(within(form).getByLabelText("Nombre del turno")).toHaveValue(
      "Tarde",
    );
    expect(within(form).getByLabelText("Día de la semana")).toHaveValue("4");
    expect(within(form).getByLabelText("Hasta")).toHaveValue("17:30");
    expect(form.querySelector('input[name="turnoId"]')).toHaveValue("t2");
    expect(
      screen.getByRole("link", { name: "Cancelar edición" }),
    ).toHaveAttribute("href", "/admin/talleres/w1/turnos");
  });

  it("deleting asks first, then submits a native post with the turno id", async () => {
    render(stub());
    const user = userEvent.setup();
    const posted: Record<string, FormDataEntryValue>[] = [];
    const observe = (event: Event) => {
      event.preventDefault(); // keep jsdom from attempting a real navigation
      if (event.target instanceof HTMLFormElement)
        posted.push({
          method: event.target.method,
          ...Object.fromEntries(new FormData(event.target).entries()),
        });
    };
    document.addEventListener("submit", observe);
    try {
      const deleteButton = await screen.findByRole("button", {
        name: "Eliminar Tarde",
      });
      const deleteForm = deleteButton.closest("form");
      if (!deleteForm) throw new Error("delete form missing");
      await user.click(deleteButton);
      expect(
        await within(deleteForm).findByRole("dialog", {
          name: "¿Eliminar el turno?",
        }),
      ).toBeVisible();
      expect(posted).toEqual([]);
      await user.click(
        within(deleteForm).getByRole("button", { name: "Eliminar" }),
      );
    } finally {
      document.removeEventListener("submit", observe);
    }
    expect(posted).toEqual([
      { method: "post", intent: "delete", turnoId: "t2" },
    ]);
  });

  it("retiring asks first and submits only after confirmation", async () => {
    render(stub());
    const user = userEvent.setup();
    const posted: Record<string, FormDataEntryValue>[] = [];
    const observe = (event: Event) => {
      event.preventDefault();
      if (event.target instanceof HTMLFormElement)
        posted.push({
          method: event.target.method,
          ...Object.fromEntries(new FormData(event.target).entries()),
        });
    };
    document.addEventListener("submit", observe);
    try {
      const retireButton = await screen.findByRole("button", {
        name: "Retirar Mañana",
      });
      const retireForm = retireButton.closest("form");
      if (!retireForm) throw new Error("retire form missing");
      await user.click(retireButton);
      expect(
        await within(retireForm).findByRole("dialog", {
          name: "¿Retirar el turno?",
        }),
      ).toBeVisible();
      expect(posted).toEqual([]);
      await user.click(
        within(retireForm).getByRole("button", { name: "Retirar" }),
      );
    } finally {
      document.removeEventListener("submit", observe);
    }
    expect(posted).toEqual([
      { method: "post", intent: "retire", turnoId: "t1" },
    ]);
  });

  it("shows a rejected form with its typed values and field messages", async () => {
    render(
      stub({
        actionData: {
          values: { ...EMPTY_VALUES, label: "Mañana", defaultCapacity: "0" },
          errors: { defaultCapacity: "Ingresá un número entero de 1 a 500." },
          formError: "Revisá los campos marcados e intentá de nuevo.",
          turnoId: "",
        },
      }),
    );
    expect(await screen.findByLabelText("Nombre del turno")).toHaveValue(
      "Mañana",
    );
    expect(
      screen.getByLabelText("Capacidad por defecto"),
    ).toHaveAccessibleDescription(/Ingresá un número entero de 1 a 500/);
    expect(
      screen.getByText("Revisá los campos marcados e intentá de nuevo."),
    ).toBeVisible();
  });

  it("shows the reason a row action was refused above the list", async () => {
    render(
      stub({
        actionData: {
          listError:
            "Es el único turno activo de un taller publicado. Pausá el taller primero.",
        },
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pausá el taller primero.",
    );
  });
});
