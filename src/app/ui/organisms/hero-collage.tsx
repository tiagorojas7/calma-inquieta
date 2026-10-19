import { BotanicalSprig } from "../atoms/botanical-sprig";
import { Butterfly } from "../atoms/butterfly";
import { Frame } from "../atoms/frame";
import { Image } from "../atoms/image";
import { Picture } from "../atoms/picture";
import { PaperNote } from "../molecules/paper-note";
import { VideoLoop } from "../molecules/video-loop";

export type CollageImg = {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcSet?: string;
};

export type CollageLoop = {
  poster: CollageImg;
  sources: readonly { src: string; type: string }[];
  width: number;
  height: number;
};

/** The viewport from which the collage replaces the phone backdrop. */
export const HERO_DESKTOP_MEDIA = "(min-width: 64rem)";
/** The exact complement of the desktop media; the route preload needs it too. */
export const HERO_MOBILE_MEDIA = "not all and (min-width: 64rem)";
/** Layout width of the collage lead: about 26 % of the viewport (motifs.css `.collage-lead`). */
export const HERO_LEAD_SIZES = "30vw";
/** Layout width of a secondary collage photo: about 22 % of the viewport. */
const COLLAGE_TILE_SIZES = "22vw";

/**
 * A 1 by 1 transparent WebP. The two LCP pictures swap to it on the
 * breakpoint where they are hidden, so an eager, high priority image never
 * downloads where the other one is shown (the preload links use the same
 * complementary media).
 */
const BLANK_PIXEL =
  "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";

type Props = {
  /** Slot order: the large lead, the framed photo, the torn photo. */
  photos: readonly CollageImg[];
  note: string;
  keywords: readonly string[];
  loop?: CollageLoop | undefined;
};

/**
 * The image5 collage (S2, S7). From lg it lays out overlapping photos of
 * different ratios on a coordinate board (motifs.css `.hero-collage`): the
 * lead bleeds past the page edge, the second photo sits in a white frame,
 * the third has a torn-paper edge, the ambient loop is one more tile, and a
 * kraft note, sprigs, a big butterfly and a tracked word list are laid on
 * top. Below lg the board dissolves: only the note, a sprig and the
 * butterfly stay, over the phone backdrop.
 */
export function HeroCollage({ photos, note, keywords, loop }: Props) {
  const [lead, framed, torn] = photos;
  return (
    <div className="hero-collage max-lg:contents">
      {lead ? (
        <div className="collage-lead max-lg:hidden">
          <Picture
            {...lead}
            className="aspect-3/4 h-auto w-full object-cover"
            aboveTheFold
            fetchPriority="high"
            sizes={HERO_LEAD_SIZES}
            sources={[
              {
                media: HERO_MOBILE_MEDIA,
                srcSet: BLANK_PIXEL,
                width: lead.width,
                height: lead.height,
              },
            ]}
          />
        </div>
      ) : null}
      {torn ? (
        <div className="collage-torn max-lg:hidden">
          <div className="photo-torn">
            <Image
              {...torn}
              intrinsicRatio={false}
              sizes={COLLAGE_TILE_SIZES}
              className="aspect-square h-auto w-full object-cover"
            />
          </div>
        </div>
      ) : null}
      {framed ? (
        <Frame tilt="left" className="collage-framed max-lg:hidden">
          <Image
            {...framed}
            intrinsicRatio={false}
            sizes={COLLAGE_TILE_SIZES}
            className="aspect-4/3 h-auto w-full object-cover"
          />
        </Frame>
      ) : null}
      {loop ? (
        <div className="collage-loop max-lg:hidden">
          <VideoLoop
            poster={loop.poster}
            sizes={COLLAGE_TILE_SIZES}
            sources={loop.sources}
            width={loop.width}
            height={loop.height}
            className="w-full"
          />
        </div>
      ) : null}
      <PaperNote tilt="left" className="hero-note">
        {note}
      </PaperNote>
      <BotanicalSprig
        size="lg"
        variant="olive"
        className="hero-sprig hero-sprig-a"
      />
      <BotanicalSprig
        size="md"
        variant="wheat"
        className="hero-sprig hero-sprig-b"
      />
      <Butterfly size="lg" className="hero-butterfly" />
      <ul className="hero-keywords max-lg:hidden">
        {keywords.map((word) => (
          <li key={word}>{word}</li>
        ))}
      </ul>
    </div>
  );
}
