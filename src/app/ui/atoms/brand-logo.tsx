import { Image } from "./image";

type LogoImage = {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
};

/** Rendered height is 3rem (see the T6 brand section of layout.css). */
const LOGO_SIZES = "48px";

/**
 * The "CI" butterfly monogram. It is decorative (empty alt): the wordmark
 * beside it names the link. `logo` is the dark ink for light grounds;
 * `logoLight` is the cream version for a dark photo. When both are given,
 * layout.css shows one of them from the header state, and both are lazy so
 * the browser fetches only the one that is displayed (a hidden lazy image is
 * never requested). Alone, the dark logo loads eagerly.
 */
export function BrandLogo({
  logo,
  logoLight,
  className = "",
}: {
  logo?: LogoImage;
  logoLight?: LogoImage;
  className?: string;
}) {
  if (!logo) {
    return null;
  }
  const both = Boolean(logoLight);
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <Image
        {...logo}
        alt=""
        sizes={LOGO_SIZES}
        aboveTheFold={!both}
        data-ink="dark"
        className="brand-logo-img"
      />
      {logoLight && (
        <Image
          {...logoLight}
          alt=""
          sizes={LOGO_SIZES}
          data-ink="light"
          className="brand-logo-img"
        />
      )}
    </span>
  );
}
