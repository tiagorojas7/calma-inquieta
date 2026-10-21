# Media pipeline

## Image derivation

Keep originals in the external `../CalmaInquieta-media` workspace. They are
source material, not repository assets, and must never be committed.

Run the recipe from the repository root:

```sh
corepack pnpm media:derive tooling/media/recipes/design-adjustments.json "<sourceDir>"
```

An optional third argument selects an output root; it is useful for a temporary
harness. Outputs always go below `public/media/<area>/`, never `src/`. The
command prints one JSON registry fragment per job with the actual dimensions.

A recipe is either an array of jobs or `{ "jobs": [...] }`. Each job has this
shape:

```json
{
  "id": "home-hero-mobile",
  "source": "source-photo.jpg",
  "area": "home",
  "aspect": 0.8,
  "focus": { "x": 0.5, "y": 0.4 },
  "widths": [480, 720, 1080],
  "format": "webp",
  "quality": 78,
  "background": "#f5ead9",
  "grade": "warm"
}
```

`aspect`, `focus`, `quality`, `background`, and `grade` are optional. Focus coordinates
are normalized from zero to one. The command applies EXIF rotation, crops the
largest focused aspect box, never upscales, and adds the source width when it
falls between requested widths. WebP defaults to quality 78; JPEG uses mozjpeg
at quality 82; PNG is preserved when requested. A successful replacement
removes earlier hashed files for the same id and width.

Names contain the first eight hexadecimal characters of the SHA-256 digest of
the final bytes: `<id>-<width>.<hash8>.<ext>`. This makes output safe for
immutable cache headers and requires registry paths to be updated from the
printed fragment.

## Colour grade

The client photos are phone shots with mixed light. A job with `"grade": "warm"`
gets one shared grade so the curated photos read as one warm, creamy family.
The grade runs after the crop and resize and before encoding, with sharp
operations only: a channel recombination (white balance), a linear contrast
pivot around mid-grey, then a brightness and saturation modulation. A job
without `grade` is encoded exactly as before (byte-identical output). An unknown
grade name fails before anything is written.

Preset `warm` (`GRADE_PRESETS` in `tooling/media/derive.ts`):

| Parameter    | Value | Effect                                   |
| ------------ | ----- | ---------------------------------------- |
| `red`        | 1.08  | red channel gain (warmer whites)         |
| `green`      | 1.01  | green channel gain                       |
| `blue`       | 0.86  | blue channel gain (less cold cast)       |
| `contrast`   | 0.93  | below 1 softens contrast around mid-grey |
| `brightness` | 1.05  | slight lift                              |
| `saturation` | 0.9   | modest trim so colours stay natural      |

Every photo job in `design-adjustments.json` uses `"grade": "warm"` except two:
`share-default` (its path is pinned by `DEFAULT_SHARE_IMAGE`) and
`home-loop-poster` (it must keep matching the ungraded video).

To re-derive after changing a preset or a crop:

1. Run the recipe command above. Every graded output gets a new `hash8` name
   and `media:derive` deletes the older files for the same id and width.
2. `home-loop-poster` is the last job and needs `home-loop-poster.png` in the
   source folder (see the next section). If that file is absent the run stops
   at that job with "Input file is missing"; every earlier job is already
   written, and the existing poster files stay untouched.
3. Copy the new paths from the printed fragments into
   `src/modules/site-content/infrastructure/content/media-assets.ts`. Widths and
   heights do not change unless the crop does.
4. Run `corepack pnpm test src/modules/site-content`: the parity test checks
   names, hashes, decoded sizes and the budgets below.

A preset change moves every graded image at once, so look at a before and after
contact sheet before keeping it.

## Ambient loop

Run these commands manually in the external media workspace. The source is
`VID_20261014_185300580.mp4` (1920x1080 with a -90 degree rotation tag, so
ffmpeg turns it into 1080x1920 before the filters). The crop offset `285` is
the centered 4:5 window; it was reviewed and used as is. `-frames:v 180` keeps
exactly 6.000 seconds at 30 fps (`-t 6` produced 6.033 s in the MP4).

```sh
ffmpeg -i VID_20261014_185300580.mp4 -frames:v 180 -an -map_metadata -1 \
  -vf "crop=1080:1350:0:285,scale=720:900:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 28 -movflags +faststart home-loop.mp4
ffmpeg -i VID_20261014_185300580.mp4 -frames:v 180 -an -map_metadata -1 \
  -vf "crop=1080:1350:0:285,scale=720:900:flags=lanczos,fps=30" \
  -c:v libvpx-vp9 -b:v 0 -crf 42 -row-mt 1 -deadline good home-loop.webm
ffmpeg -i VID_20261014_185300580.mp4 -frames:v 1 \
  -vf "crop=1080:1350:0:285,scale=720:900" home-loop-poster.png
```

The WebM uses `-crf 42`: `-crf 36` gave 2.18 MB, over the 1,572,864 byte
budget, while 42 gives about 1.28 MB (the MP4 at crf 28 is about 1.12 MB).

The poster goes through the image recipe (job `home-loop-poster`, area `video`):
put `home-loop-poster.png` in the source folder and run `media:derive`.
Rename each video from its final bytes before adding it to
`public/media/video/`:

```sh
for ext in mp4 webm; do hash=$(sha256sum "home-loop.$ext" | cut -c1-8); mv "home-loop.$ext" "home-loop-720.$hash.$ext"; done
```

If the cut has a visible seam, an optional 0.3-second crossfade is allowed;
review the result by eye before publishing.

## Budgets

Each image must be at most 500 KB. Each video must be at most 1,572,864 bytes,
and all curated media together must be at most 8 MB. Keep generated public
outputs only after the registry and parity checks accept their names, hashes,
and dimensions.
