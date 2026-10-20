import {
  index,
  layout,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
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
