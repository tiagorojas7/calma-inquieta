import { BotanicalSprig } from "../atoms/botanical-sprig";
import { BrandLogo } from "../atoms/brand-logo";
import { Icon } from "../atoms/icon";
import { ScriptText } from "../atoms/script-text";
import { VisuallyHidden } from "../atoms/visually-hidden";
import { NavLink } from "../molecules/nav-link";
import { microcopy } from "../microcopy";

type Page = { id: string; path: string; label: string; indexable: boolean };

type SiteFooterProfile = {
  name: string;
  address: { street: string; locality: string };
  bajada: string;
  instagramHref: string;
  whatsappHref: string;
  /** Google Maps directions to the studio; the Maps link is left out without it. */
  directionsHref?: string;
  whatsappDisplay: string;
  provisional: boolean;
  email?: string;
  phone?: string;
  hours?: string;
};

type SiteFooterProps = {
  pages: readonly Page[];
  profile: SiteFooterProfile;
  /** The dark-ink monogram shown beside the name; omitted when unpublished. */
  brand?: {
    logo?: { src: string; srcSet?: string; width: number; height: number };
  };
  inert?: boolean;
};

const isExternal = (href: string) => /^https?:/.test(href);
const externalProps = (href: string) =>
  isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};

const socialLink =
  "group inline-flex min-h-11 items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-800";
const socialIcon =
  "footer-social-icon inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-clay-800 text-canvas transition-[background-color,transform,box-shadow] duration-200 ease-calm group-hover:bg-clay-700 group-hover:shadow-card group-focus-visible:bg-clay-700 motion-safe:group-hover:-translate-y-0.5";

/**
 * Closing footer: a deep clay booking panel (the call to action), then the
 * brand block (logo, name, tagline in the script accent, address), the contact
 * column with WhatsApp, Instagram and Google Maps icon links, and the page
 * navigation. Every footer control is at least 44 px tall.
 */
export function SiteFooter({ pages, profile, brand, inert }: SiteFooterProps) {
  return (
    <footer
      className="site-footer mt-section border-t border-tan-400 bg-sand-200 text-ink-900"
      inert={inert || undefined}
    >
      <div className="mx-auto flex max-w-page flex-col gap-12 px-gutter py-12 lg:py-16">
        <div className="site-footer-cta tone-cocoa band-glow band-frame relative flex overflow-hidden flex-col gap-6 rounded-md bg-cocoa-900 px-8 py-10 text-canvas shadow-lift lg:flex-row lg:items-center lg:justify-between lg:px-14 lg:py-12">
          <div className="flex max-w-prose flex-col gap-2">
            <p className="font-display text-h2 font-semibold">
              Tu lugar te está esperando
            </p>
            <p className="text-lead text-sand-200">
              Escribinos y coordinamos tu primer taller.
            </p>
          </div>
          <BotanicalSprig
            size="lg"
            variant="olive"
            light
            className="absolute -bottom-2 right-64 hidden lg:block"
          />
          <a
            href={profile.whatsappHref}
            data-footer-cta=""
            {...externalProps(profile.whatsappHref)}
            className="relative z-10 inline-flex min-h-11 items-center gap-2 self-start rounded-pill bg-canvas px-7 py-3 font-sans font-semibold text-cocoa-900 shadow-button transition-[background-color,box-shadow,transform] duration-200 ease-calm hover:bg-sand-200 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canvas motion-safe:hover:-translate-y-0.5"
          >
            <Icon name="whatsapp" className="size-5" />
            Reservá tu lugar
            {isExternal(profile.whatsappHref) && (
              <VisuallyHidden> {microcopy.opensInNewTab}</VisuallyHidden>
            )}
          </a>
        </div>
        <div className="site-footer-grid">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <BrandLogo {...(brand?.logo ? { logo: brand.logo } : {})} />
              <p className="font-display text-2xl font-semibold">
                {profile.name}
              </p>
            </div>
            <ScriptText as="p">{profile.bajada}</ScriptText>
            <address className="not-italic">
              <p>{profile.address.street}</p>
              <p>{profile.address.locality}</p>
            </address>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={profile.whatsappHref}
              data-footer-social=""
              {...externalProps(profile.whatsappHref)}
              className={socialLink}
            >
              <span className={socialIcon}>
                <Icon name="whatsapp" />
              </span>
              Escribinos por WhatsApp
            </a>
            {!profile.provisional && <p>{profile.whatsappDisplay}</p>}
            <a
              href={profile.instagramHref}
              data-footer-social=""
              {...externalProps(profile.instagramHref)}
              className={socialLink}
            >
              <span className={socialIcon}>
                <Icon name="instagram" />
              </span>
              Instagram
            </a>
            {profile.directionsHref && (
              <a
                href={profile.directionsHref}
                data-footer-social=""
                {...externalProps(profile.directionsHref)}
                className={socialLink}
              >
                <span className={socialIcon}>
                  <Icon name="map" />
                </span>
                <span>
                  {microcopy.directions}
                  <VisuallyHidden> en Google Maps</VisuallyHidden>
                </span>
              </a>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="link-underline link-underline-rest self-start"
              >
                {profile.email}
              </a>
            )}
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="link-underline link-underline-rest self-start"
              >
                {profile.phone}
              </a>
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
      </div>
    </footer>
  );
}
