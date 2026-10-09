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

export function SiteHeader({
  pages,
  profile,
  menuOpen,
  onMenuOpenChange,
}: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-6">
      <a href="/" className="font-display text-2xl" aria-label="Calma Inquieta">
        Calma Inquieta
      </a>
      <MobileNav menuOpen={menuOpen} onMenuOpenChange={onMenuOpenChange} />
      <div
        id="menu-principal"
        data-state={menuOpen ? "open" : "closed"}
        className="max-lg:data-[state=closed]:hidden max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:flex max-lg:min-h-screen max-lg:w-full max-lg:flex-col max-lg:gap-8 max-lg:overflow-y-auto max-lg:bg-sand-200 max-lg:px-gutter max-lg:py-24 lg:flex lg:items-center lg:gap-8"
      >
        <nav aria-label="Principal">
          <ul className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {pages.map((page) => (
              <li key={page.id}>
                <NavLink
                  href={page.path}
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
          className="min-h-11 rounded-md bg-clay-600 px-6 py-3 font-sans text-white hover:bg-clay-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800"
          onClick={() => {
            onMenuOpenChange(false);
          }}
        >
          Escribinos
          <VisuallyHidden> por WhatsApp</VisuallyHidden>
        </a>
      </div>
    </header>
  );
}
