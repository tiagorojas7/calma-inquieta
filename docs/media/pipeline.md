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
  "background": "#f5ead9"
}
```

`aspect`, `focus`, `quality`, and `background` are optional. Focus coordinates
are normalized from zero to one. The command applies EXIF rotation, crops the
largest focused aspect box, never upscales, and adds the source width when it
falls between requested widths. WebP defaults to quality 78; JPEG uses mozjpeg
at quality 82; PNG is preserved when requested. A successful replacement
removes earlier hashed files for the same id and width.

Names contain the first eight hexadecimal characters of the SHA-256 digest of
the final bytes: `<id>-<width>.<hash8>.<ext>`. This makes output safe for
immutable cache headers and requires registry paths to be updated from the
printed fragment.

## Ambient loop

Run these commands manually in the external media workspace. Adjust the crop
offset (`285` for the reviewed mirror) to the source and record the selected
offset here with the asset review.

```sh
ffmpeg -ss 0 -t 6 -i VID_20261014_185300580.mp4 -an -map_metadata -1 \
  -vf "crop=1080:1350:0:285,scale=720:900:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 28 -movflags +faststart home-loop.mp4
ffmpeg -ss 0 -t 6 -i VID_20261014_185300580.mp4 -an -map_metadata -1 \
  -vf "crop=1080:1350:0:285,scale=720:900:flags=lanczos,fps=30" \
  -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good home-loop.webm
ffmpeg -ss 0 -i VID_20261014_185300580.mp4 -frames:v 1 \
  -vf "crop=1080:1350:0:285,scale=720:900" home-loop-poster.png
```

The poster goes through the image recipe. Rename each video from its final
bytes before adding it to `public/media/video/`:

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
