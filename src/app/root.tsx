import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import appCss from "./ui/styles/app.css?url";
import { ErrorPage } from "./ui/templates/error-page";

// The sand-200 token value (tokens.css); root.test.ts asserts it matches.
const THEME_COLOR = "#e6d7c4";

const preloadFont = (file: string) => ({
  rel: "preload",
  href: `/fonts/${file}`,
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous" as const,
});

export const links: Route.LinksFunction = () => [
  preloadFont("cormorant-garamond-latin-400-normal.woff2"),
  preloadFont("montserrat-latin-400-normal.woff2"),
  { rel: "stylesheet", href: appCss },
  { rel: "icon", href: "/media/stand-ins/favicon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={THEME_COLOR} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// Generic on purpose: no error message, stack or route detail reaches the page.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return <ErrorPage status={notFound ? 404 : 500} />;
}
