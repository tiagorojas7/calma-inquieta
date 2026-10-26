import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  route("sin-acceso", "routes/admin-denied.tsx"),
  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/home.tsx"),
    route("imagenes", "routes/admin/image-upload.ts"),
    route("talleres", "routes/admin/workshops.tsx"),
    route("talleres/nuevo", "routes/admin/workshop-new.tsx"),
    route("talleres/:id", "routes/admin/workshop-detail.tsx"),
    route("talleres/:id/turnos", "routes/admin/turnos.tsx"),
    route("talleres/:id/periodos", "routes/admin/workshop-periods.tsx"),
    route(
      "talleres/:id/periodos/:period",
      "routes/admin/workshop-period-detail.tsx",
    ),
    route("intensivos", "routes/admin/intensives.tsx"),
    route("intensivos/nuevo", "routes/admin/intensive-new.tsx"),
    route("intensivos/:id", "routes/admin/intensive-detail.tsx"),
    route("profesores", "routes/admin/teachers.tsx"),
    route("profesores/nuevo", "routes/admin/teacher-new.tsx"),
    route("profesores/:id", "routes/admin/teacher-detail.tsx"),
  ]),
  route("imagenes/:file", "routes/media-file.ts"),
  route("status", "routes/status.tsx"),
  route("robots.txt", "routes/robots.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  layout("routes/public-layout.tsx", [
    index("routes/home.tsx"),
    route("quienes-somos", "routes/about.tsx"),
    route("contacto", "routes/contact.tsx"),
    route("*", "routes/not-found.tsx", { id: "routes/not-found-splat" }),
    route("talleres", "routes/talleres.tsx"),
    route("talleres/:slug", "routes/taller.tsx"),
    route("intensivos", "routes/intensivos.tsx"),
    route("intensivos/:slug", "routes/intensivo.tsx"),
    route("eventos-privados", "routes/coming-soon.tsx", {
      id: "coming-soon/eventos-privados",
    }),
  ]),
] satisfies RouteConfig;
