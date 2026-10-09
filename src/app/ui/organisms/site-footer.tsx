import { NavLink } from "../molecules/nav-link";

type Page = { id: string; path: string; label: string; indexable: boolean };

type SiteFooterProfile = {
  name: string;
  address: { street: string; locality: string };
  bajada: string;
  instagramHref: string;
  whatsappHref: string;
  whatsappDisplay: string;
  provisional: boolean;
  email?: string;
  phone?: string;
  hours?: string;
};

type SiteFooterProps = {
  pages: readonly Page[];
  profile: SiteFooterProfile;
  inert?: boolean;
};

export function SiteFooter({ pages, profile, inert }: SiteFooterProps) {
  return (
    <footer
      className="mt-16 border-t border-tan-400 py-10"
      inert={inert || undefined}
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
        <div>
          <p className="font-display text-2xl">{profile.name}</p>
          <p>{profile.address.street}</p>
          <p>{profile.address.locality}</p>
          <p className="mt-4 max-w-prose">{profile.bajada}</p>
        </div>
        <div className="flex flex-col gap-2">
          <a
            href={profile.whatsappHref}
            className="underline underline-offset-4"
            aria-label="Escribinos por WhatsApp"
          >
            Escribinos por WhatsApp
          </a>
          {!profile.provisional && <p>{profile.whatsappDisplay}</p>}
          <a
            href={profile.instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Instagram
          </a>
          {profile.email && (
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`}>{profile.phone}</a>
          )}
          {profile.hours && <p>{profile.hours}</p>}
        </div>
        <nav aria-label="Páginas">
          <ul className="flex flex-col gap-2">
            {pages.map((page) => (
              <li key={page.id}>
                <NavLink href={page.path}>{page.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
