import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { VisuallyHidden } from "../atoms/visually-hidden";
import { NavLink } from "../molecules/nav-link";
import { MobileNav } from "./mobile-nav";

type Page = { id: string; path: string; label: string; indexable: boolean };

type SiteHeaderProps = {
  pages: readonly Page[];
  profile: { whatsappHref: string };
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
};

/** Scroll distance (px) past which the header turns solid. */
const SOLID_AFTER_PX = 24;

/** Stagger index for motion.css (`--i`): links enter one after another. */
const stagger = (index: number) => ({ "--i": index }) as CSSProperties;

/**
 * Sticky header: transparent over the page top, solid sand with a soft
 * shadow after scrolling about 24 px. The server markup is solid, so it
 * reads without JavaScript; the scroll listener only exists after mount.
 * On mobile the menu is a full-screen overlay (motion.css staggers its
 * links in); the toggle above it is the close button.
 */
export function SiteHeader({
  pages,
  profile,
  menuOpen,
  onMenuOpenChange,
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(true);

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > SOLID_AFTER_PX);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header
      data-solid={String(solid)}
      className={`site-header sticky top-0 z-30 transition-[background-color,box-shadow] duration-300 ease-calm ${
        solid ? "bg-sand-200 shadow-header" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-page items-center justify-between gap-6 px-gutter py-4">
        <Link
          to="/"
          viewTransition
          inert={menuOpen || undefined}
          className="relative z-50 shrink-0 whitespace-nowrap font-display text-2xl font-semibold text-ink-900"
          aria-label="Calma Inquieta"
        >
          Calma Inquieta
        </Link>
        <MobileNav menuOpen={menuOpen} onMenuOpenChange={onMenuOpenChange} />
        <div
          id="menu-principal"
          data-state={menuOpen ? "open" : "closed"}
          className="menu-overlay max-lg:data-[state=closed]:hidden max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:flex max-lg:min-h-screen max-lg:w-full max-lg:flex-col max-lg:justify-center max-lg:gap-10 max-lg:overflow-y-auto max-lg:bg-sand-200 max-lg:px-gutter max-lg:py-24 lg:flex lg:items-center lg:gap-6"
        >
          <nav aria-label="Principal">
            <ul className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-5 xl:gap-8">
              {pages.map((page, index) => (
                <li key={page.id} className="menu-item" style={stagger(index)}>
                  <NavLink
                    href={page.path}
                    className="text-ink-900 lg:whitespace-nowrap max-lg:font-display max-lg:text-4xl max-lg:font-medium"
                    onNavigate={() => {
                      onMenuOpenChange(false);
                    }}
                  >
                    {page.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={profile.whatsappHref}
            aria-label="Escribinos por WhatsApp"
            style={stagger(pages.length)}
            className="menu-item inline-block min-h-11 rounded-md bg-clay-600 px-6 py-3 font-sans text-white transition-[background-color,box-shadow,transform] duration-200 ease-calm hover:bg-clay-700 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 motion-safe:hover:-translate-y-0.5 max-lg:self-start"
            onClick={() => {
              onMenuOpenChange(false);
            }}
          >
            Escribinos
            <VisuallyHidden> por WhatsApp</VisuallyHidden>
          </a>
        </div>
      </div>
    </header>
  );
}
