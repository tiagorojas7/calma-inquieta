import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { BrandLogo } from "../atoms/brand-logo";
import { Icon } from "../atoms/icon";
import { ScriptText } from "../atoms/script-text";
import { VisuallyHidden } from "../atoms/visually-hidden";
import { NavLink } from "../molecules/nav-link";
import { MobileNav } from "./mobile-nav";

type Page = { id: string; path: string; label: string; indexable: boolean };

type LogoImage = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
};

type SiteHeaderProps = {
  pages: readonly Page[];
  profile: { whatsappHref: string; tagline?: string };
  /** The monogram in its two inks; either may be missing (wordmark only). */
  brand?: { logo?: LogoImage; logoLight?: LogoImage };
  /**
   * "dark-below-lg": the page opens with a dark photo behind the transparent
   * header below lg, so the header uses light ink and the light logo until it
   * turns solid. Absent: the normal ink everywhere.
   */
  heroBackdrop?: "dark-below-lg";
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
 * links in); the toggle above it is the close button. Over a dark hero photo
 * (`heroBackdrop`) the transparent header below lg uses light ink and the
 * light logo; layout.css swaps them from `data-backdrop` and `data-solid`, so
 * the first paint needs no script.
 */
export function SiteHeader({
  pages,
  profile,
  brand,
  heroBackdrop,
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
      data-backdrop={heroBackdrop}
      className={`site-header sticky top-0 z-30 text-ink-900 transition-[background-color,box-shadow] duration-300 ease-calm ${
        solid ? "bg-sand-200 shadow-header" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-page items-center justify-between gap-6 px-gutter py-4">
        <Link
          to="/"
          viewTransition
          inert={menuOpen || undefined}
          className="brand-link relative z-50 inline-flex shrink-0 items-center gap-3 whitespace-nowrap font-display font-semibold text-current"
          aria-label="Calma Inquieta"
        >
          <BrandLogo
            {...(brand?.logo ? { logo: brand.logo } : {})}
            {...(brand?.logo && heroBackdrop && brand.logoLight
              ? { logoLight: brand.logoLight }
              : {})}
          />
          <span className="text-2xl lg:text-xl xl:text-2xl">
            Calma Inquieta
          </span>
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
            className="menu-item inline-flex min-h-11 items-center gap-2 rounded-md bg-clay-600 px-6 py-3 font-sans text-white transition-[background-color,box-shadow,transform] duration-200 ease-calm hover:bg-clay-700 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800 motion-safe:hover:-translate-y-0.5 max-lg:self-start"
            onClick={() => {
              onMenuOpenChange(false);
            }}
          >
            <Icon name="whatsapp" className="size-5 lg:max-xl:hidden" />
            <span>
              Escribinos
              <VisuallyHidden> por WhatsApp</VisuallyHidden>
            </span>
          </a>
          {profile.tagline ? (
            <ScriptText
              as="p"
              style={stagger(pages.length + 1)}
              className="menu-item lg:hidden"
            >
              {profile.tagline}
            </ScriptText>
          ) : null}
        </div>
      </div>
    </header>
  );
}
