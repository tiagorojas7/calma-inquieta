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
    index("routes/not-found.tsx"),
    route("*", "routes/not-found.tsx", { id: "routes/not-found-splat" }),
    route("talleres", "routes/coming-soon.tsx", { id: "coming-soon/talleres" }),
    route("intensivos", "routes/coming-soon.tsx", {
      id: "coming-soon/intensivos",
    }),
    route("eventos-privados", "routes/coming-soon.tsx", {
      id: "coming-soon/eventos-privados",
    }),
  ]),
] satisfies RouteConfig;
