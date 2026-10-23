import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { IntensiveForm } from "~/app/ui/admin/intensive-form";
import AdminIntensiveDetail from "./intensive-detail";
import AdminIntensiveNew from "./intensive-new";
import AdminIntensives from "./intensives";

describe("intensive admin screens", () => {
  it("renders list rows and native anchors", async () => {
    const Stub = createRoutesStub([
      {
        id: "intensives",
        path: "/admin/intensivos",
        Component: AdminIntensives,
        loader: () => ({
          filter: "vigentes",
          rows: [
            {
              id: "i1",
              name: "Cerámica de sábado",
              teacherName: "Ana Gómez",
              status: "draft",
              dateTime: "10 oct 2026, 10:00",
              capacity: 12,
            },
          ],
        }),
      },
    ]);
    const { container } = render(
      <Stub
        initialEntries={["/admin/intensivos"]}
        hydrationData={{
          loaderData: {
            intensives: {
              filter: "vigentes",
              rows: [
                {
                  id: "i1",
                  name: "Cerámica de sábado",
                  teacherName: "Ana Gómez",
                  status: "draft",
                  dateTime: "10 oct 2026, 10:00",
                  capacity: 12,
                },
              ],
            },
          },
        }}
      />,
    );
    expect(
      await screen.findByRole("link", { name: "Cerámica de sábado" }),
    ).toHaveAttribute("href", "/admin/intensivos/i1");
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByRole("link", { name: "Archivados" })).toHaveAttribute(
      "href",
      "/admin/intensivos?estado=archivados",
    );
    await expectNoAxeViolations(container);
  }, 30_000);

  it("renders every draft field, six ImageField inputs, and no lifecycle controls", async () => {
    const Stub = createRoutesStub([
      {
        id: "intensive-new",
        path: "/admin/intensivos/nuevo",
        Component: AdminIntensiveNew,
        loader: () => ({
          teachers: [{ id: "t1", name: "Ana", modality: "own" }],
        }),
        action: () => null,
      },
    ]);
    const { container } = render(
      <Stub
        initialEntries={["/admin/intensivos/nuevo"]}
        hydrationData={{
          loaderData: {
            "intensive-new": {
              teachers: [{ id: "t1", name: "Ana", modality: "own" }],
            },
          },
        }}
      />,
    );
    expect(await screen.findByLabelText("Nombre")).toBeVisible();
    expect(screen.getByLabelText("Fecha")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Incluye materiales")).not.toBeChecked();
    expect(screen.getAllByLabelText("Imagen")).toHaveLength(6);
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/admin/intensivos",
    );
    expect(screen.queryByRole("button", { name: "Publicar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archivar" })).toBeNull();
    await expectNoAxeViolations(container);
  }, 30_000);

  it("renders the edit screen and audit without axe violations", async () => {
    const Stub = createRoutesStub([
      {
        id: "intensive-detail",
        path: "/admin/intensivos/:id",
        Component: AdminIntensiveDetail,
        loader: () => ({
          id: "i1",
          values: {
            name: "Cerámica de sábado",
            slug: "ceramica-sabado",
            summary: "Un resumen",
            description: "Un detalle",
            teacherId: "t1",
            percentage: "35",
            eventDate: "2026-10-10",
            startsAt: "10:00",
            endsAt: "13:00",
            price: "30000",
            deposit: "10000",
            capacity: "12",
            minSeats: "4",
            policyText: "Traé delantal.",
            materialsIncluded: true,
            images: [],
          },
          teachers: [{ id: "t1", name: "Ana", modality: "own" }],
          audit: {
            updatedBy: "admin@example.com",
            updatedAt: "10 oct 2026, 09:00",
          },
        }),
        action: () => null,
      },
    ]);
    const { container } = render(
      <Stub
        initialEntries={["/admin/intensivos/i1"]}
        hydrationData={{
          loaderData: {
            "intensive-detail": {
              id: "i1",
              values: {
                name: "Cerámica de sábado",
                slug: "ceramica-sabado",
                summary: "Un resumen",
                description: "Un detalle",
                teacherId: "t1",
                percentage: "35",
                eventDate: "2026-10-10",
                startsAt: "10:00",
                endsAt: "13:00",
                price: "30000",
                deposit: "10000",
                capacity: "12",
                minSeats: "4",
                policyText: "Traé delantal.",
                materialsIncluded: true,
                images: [],
              },
              teachers: [{ id: "t1", name: "Ana", modality: "own" }],
              audit: {
                updatedBy: "admin@example.com",
                updatedAt: "10 oct 2026, 09:00",
              },
            },
          },
        }}
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Editar intensivo" }),
    ).toBeVisible();
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(screen.getByText("10 oct 2026, 09:00")).toBeVisible();
    await expectNoAxeViolations(container);
  }, 30_000);

  it("redisplays the rejected gallery preview source", () => {
    render(
      <IntensiveForm
        values={{
          name: "Cerámica de sábado",
          slug: "ceramica-sabado",
          summary: "Un resumen",
          description: "Un detalle",
          teacherId: "t1",
          percentage: "35",
          eventDate: "2026-10-10",
          startsAt: "10:00",
          endsAt: "13:00",
          price: "30000",
          deposit: "10000",
          capacity: "12",
          minSeats: "4",
          policyText: "Traé delantal.",
          materialsIncluded: true,
          images: [
            {
              assetId: "img-1",
              src: "/imagenes/img-1.webp",
              alt: "Una taza",
            },
          ],
        }}
        errors={{}}
        teachers={[{ id: "t1", name: "Ana", modality: "own" }]}
        cancelHref="/admin/intensivos"
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/imagenes/img-1.webp",
    );
  });
});
