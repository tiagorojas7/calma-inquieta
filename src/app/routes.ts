import { index, route, type RouteConfig } from "@react-router/dev/routes";

// There is no home page in this change: every path except /status is a 404
// until change 2 adds pages. Unknown paths already have no match; the index
// route makes "/" a real 404 as well.
export default [
  index("routes/not-found.tsx"),
  route("status", "routes/status.tsx"),
] satisfies RouteConfig;
