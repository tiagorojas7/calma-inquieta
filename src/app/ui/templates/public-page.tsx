import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { useLocation } from "react-router";
import { SkipLink } from "../atoms/skip-link";
import { SiteFooter } from "../organisms/site-footer";
import { SiteHeader } from "../organisms/site-header";

type Page = { id: string; path: string; label: string; indexable: boolean };
type Profile = Parameters<typeof SiteFooter>[0]["profile"] & { name: string };

type PublicPageProps = PropsWithChildren<{
  pages: readonly Page[];
  profile: Profile;
}>;

export function PublicPage({ pages, profile, children }: PublicPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };
    query.addEventListener("change", closeOnDesktop);
    return () => {
      query.removeEventListener("change", closeOnDesktop);
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-menu-open", menuOpen);
    if (!menuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        (
          toggleRef.current ??
          document.querySelector<HTMLButtonElement>(
            'button[aria-controls="menu-principal"]',
          )
        )?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.removeAttribute("data-menu-open");
    };
  }, [menuOpen]);

  return (
    <>
      <SkipLink inert={menuOpen} />
      <SiteHeader
        pages={pages}
        profile={{ whatsappHref: profile.whatsappHref }}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
      />
      <main id="contenido" tabIndex={-1} inert={menuOpen}>
        {children}
      </main>
      <SiteFooter pages={pages} profile={profile} inert={menuOpen} />
    </>
  );
}
