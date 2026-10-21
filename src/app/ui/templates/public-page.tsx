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
  /** The monogram in its two inks; omitted logos fall back to the wordmark. */
  brand?: Parameters<typeof SiteHeader>[0]["brand"];
  /** Set when the page opens with a dark photo behind the header below lg. */
  heroBackdrop?: Parameters<typeof SiteHeader>[0]["heroBackdrop"];
}>;

export function PublicPage({
  pages,
  profile,
  brand,
  heroBackdrop,
  children,
}: PublicPageProps) {
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
      if (event.key === "Tab") {
        // Focus trap: everything outside the header is inert, and Tab wraps
        // between the toggle (close button) and the last menu control.
        const toggle = document.querySelector<HTMLElement>(
          'button[aria-controls="menu-principal"]',
        );
        const menuLinks = document.querySelectorAll<HTMLElement>(
          "#menu-principal a[href]",
        );
        const first = toggle;
        const last = menuLinks[menuLinks.length - 1] ?? toggle;
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        return;
      }
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
        profile={{
          whatsappHref: profile.whatsappHref,
          tagline: profile.bajada,
        }}
        {...(brand ? { brand } : {})}
        {...(heroBackdrop ? { heroBackdrop } : {})}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
      />
      <main
        id="contenido"
        tabIndex={-1}
        inert={menuOpen}
        className="mx-auto w-full max-w-page px-gutter"
      >
        {children}
      </main>
      <SiteFooter
        pages={pages}
        profile={profile}
        {...(brand?.logo ? { brand: { logo: brand.logo } } : {})}
        inert={menuOpen}
      />
    </>
  );
}
