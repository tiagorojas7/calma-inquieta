# Ambient Video Specification

## Purpose

Defines self-hosted decorative loops: short, muted clips that give a section life without adding information, cost on phones, or any motion for people who ask for less. This change ships exactly one loop, in the Inicio hero area. Long videos and testimonials stay on YouTube through `VideoFacade`.

Traceability: proposal scope item 6; OD-3; PD-1; owner decision Q1 (2026-10-16); slice S3.

## Requirements

### Requirement: Loop asset constraints

A self-hosted loop MUST ship as two encodes of the same clip, an H.264 MP4 and a VP9 WebM, plus a poster image. Both encodes MUST be 720 px wide or smaller, last at most 6 seconds, have no audio track, and be served from same-origin static assets in the registry area `video` (`public/media/video/`) with a content hash in the file name. Each video file MUST be at most 1,572,864 bytes (1.5 MiB). The poster MUST be an image asset registered in the media registry. This change MUST ship at most one loop, derived from the first 6 seconds of the source `vid-20261014-185300580` (`VID_20261014_185300580`). The loop source MUST NOT be a source excluded by the media registry.

#### Scenario: Size budget

- GIVEN the shipped MP4 and WebM files
- WHEN their sizes are measured
- THEN each is at most 1,572,864 bytes

#### Scenario: No audio track

- GIVEN the shipped MP4 and WebM files
- WHEN their streams are inspected
- THEN the MP4 has no sound track (no `soun` handler) and the WebM has no audio codec id (`A_OPUS`, `A_VORBIS`)

#### Scenario: Two encodes and a poster

- GIVEN the loop
- WHEN the media registry is read
- THEN the video asset lists a WebM source and an MP4 source in area `video`, with `durationSeconds` at most 6 and `audio` false, and a `posterId` that resolves to a registered image asset with intrinsic width and height and alt rules satisfied (decorative marking allowed)

#### Scenario: One loop only

- GIVEN the files under `public/media/video/`
- WHEN loops are counted
- THEN exactly one loop exists (one WebM and one MP4 of the same clip)

### Requirement: Same-origin delivery with range support

The loop MUST be requested from the site origin, with no third-party host. The deployed static host MUST answer range requests for the MP4 (status 206) so Safari can play it. The local asset worker never answers 206, so this is verified on the deployed preview; if it answers 200, the Worker range fallback (or R2) MUST be applied before the loop ships, and the poster stays the fallback on `error` or a rejected `play()`.

#### Scenario: Same origin

- GIVEN the rendered loop element
- WHEN its source URL is inspected
- THEN the URL is same-origin

#### Scenario: Range request

- GIVEN the deployed preview
- WHEN the MP4 is requested with a `Range` header
- THEN the response status is 206 with a `Content-Range` header

### Requirement: No download until it plays

The server-rendered loop tile MUST contain only a lazy decorative poster `<img>` and no `<video>` element. The `<video>` MUST mount only after hydration, once motion is allowed and the tile has intersected the viewport. The mounted element MUST use `preload="none"`, and the poster MUST stay visible until playback starts. The page MUST NOT request a video file before the loop is in view and allowed to play. The poster image MUST load lazily and MUST NOT be the largest contentful element of the page.

#### Scenario: Server markup is poster only

- GIVEN Inicio rendered on the server
- WHEN the loop tile markup is read
- THEN it contains a poster `<img>` with `alt=""` and `loading="lazy"` and contains no `<video` element

#### Scenario: Mounted attributes

- GIVEN the client has hydrated, motion is allowed and the tile has intersected the viewport
- WHEN the loop element is read
- THEN a `<video>` exists with `preload="none"`, the `muted` property set, `loop` and `playsinline`, with a WebM source followed by an MP4 source

#### Scenario: No video request on load

- GIVEN a phone viewport where the loop tile is below the fold
- WHEN the page loads without scrolling
- THEN no network request for the video file is made

#### Scenario: Poster is lazy

- GIVEN the loop poster image
- WHEN its loading attributes are read
- THEN it is `loading="lazy"` and has no high fetch priority

### Requirement: Play only while visible

The loop MUST start playing only when it intersects the viewport and MUST pause when it leaves the viewport, unless the user has paused it (see Decorative semantics and pause control). The playing state MUST be driven by an intersection observer, not by a timer. A rejected `play()` call (autoplay blocked) MUST be handled without an unhandled rejection, leaving the poster visible. A media `error` event MUST remove the video and leave the poster.

#### Scenario: Enters the viewport

- GIVEN a loop that is not reduced-motion or Save-Data blocked
- WHEN the intersection observer reports it visible
- THEN `play()` is called once

#### Scenario: Leaves the viewport

- GIVEN a playing loop
- WHEN the observer reports it no longer visible
- THEN `pause()` is called

#### Scenario: Autoplay blocked

- GIVEN `play()` rejects
- WHEN the loop becomes visible
- THEN no unhandled rejection is raised and the poster stays visible

#### Scenario: Observer unavailable

- GIVEN an environment without `IntersectionObserver`
- WHEN the component mounts
- THEN no `<video>` is mounted, `play()` is never called, no pause control is rendered and the poster stays visible

#### Scenario: Media error

- GIVEN a mounted video
- WHEN the video fires an `error` event
- THEN the video is removed and the poster stays visible

### Requirement: Reduced motion in JavaScript and video

When `prefers-reduced-motion: reduce` matches, the loop MUST NOT mount a `<video>`, MUST NOT call `play()`, MUST NOT request the video file, MUST NOT render the pause control, and MUST show only the poster. If the preference changes to `reduce` while the loop is mounted, the loop MUST unmount the video (and the pause control) and show the poster. The check MUST happen in JavaScript before any playback attempt, in addition to any CSS rule.

#### Scenario: Reduce on mount

- GIVEN `matchMedia('(prefers-reduced-motion: reduce)')` matches
- WHEN the loop becomes visible
- THEN no `<video>` is mounted, `play()` is never called and no video bytes are requested

#### Scenario: Reduce turns on during playback

- GIVEN a mounted, playing loop
- WHEN the media query starts matching `reduce`
- THEN the video element is unmounted, the pause control is removed and the poster is shown

#### Scenario: No preference

- GIVEN the media query does not match
- WHEN the loop becomes visible
- THEN playback starts

### Requirement: Save-Data

When the Save-Data signal is on (`navigator.connection.saveData === true`), the loop MUST behave like reduced motion: poster only, no `play()`, no video request. When the signal is unavailable or `false`, the loop MUST NOT be blocked by it.

#### Scenario: Save-Data on

- GIVEN `navigator.connection.saveData` is `true`
- WHEN the loop becomes visible
- THEN no `<video>` is mounted, `play()` is never called, no video bytes are requested and no pause control is rendered

#### Scenario: Signal unavailable

- GIVEN `navigator.connection` is undefined
- WHEN the loop becomes visible and reduced motion is off
- THEN playback starts

### Requirement: Decorative semantics and pause control

The loop carries no information, but it starts automatically and repeats for more than 5 seconds, so it MUST offer a pause mechanism (WCAG 2.2.2, Level A). Once the video is mounted, the tile MUST show one focusable button in its lower-right corner, in the tab order, with a target of at least 44 px by 44 px. Its accessible name MUST be "Pausar animación" while the loop is playing and "Reproducir animación" while paused by the user. The `<video>` element and the poster MUST remain decorative: `aria-hidden="true"`, no `controls` attribute, `tabindex="-1"`, no captions and no transcript. The tile wrapper MUST NOT be `aria-hidden`, because it contains the focusable button. A pause by the user MUST persist: the intersection observer MUST NOT resume playback until the user presses "Reproducir animación". Nothing the page conveys MUST depend on the loop.

#### Scenario: Video is decorative

- GIVEN the loop tile with the video mounted
- WHEN the accessibility tree is read
- THEN the `<video>` and the poster are not exposed, the video has no `controls` attribute and is not in the tab order

#### Scenario: Pause control present

- GIVEN the loop tile with the video mounted
- WHEN the tab order is read
- THEN the tile holds exactly one focusable button named "Pausar animación", at least 44 px by 44 px, and the tile wrapper is not `aria-hidden`

#### Scenario: Pause control absent without video

- GIVEN the poster-only state (server markup, reduced motion, Save-Data, or no `IntersectionObserver`)
- WHEN the tile is read
- THEN no button exists

#### Scenario: User pause persists

- GIVEN a playing loop
- WHEN the user presses "Pausar animación", then the tile leaves and re-enters the viewport
- THEN `pause()` was called, `play()` is not called again, and the button is named "Reproducir animación"

#### Scenario: User resumes

- GIVEN a loop paused by the user
- WHEN the user presses "Reproducir animación" while the tile is visible
- THEN playback resumes and the button is named "Pausar animación"

#### Scenario: axe

- GIVEN Inicio rendered with the loop
- WHEN axe-core runs
- THEN zero violations are reported

### Requirement: Never the LCP element or a layout shift

The loop and its poster MUST NOT be the LCP element on any viewport; the hero still photo is (see `home-page`). The loop tile MUST reserve its box from a declared aspect ratio and the poster's intrinsic `width` and `height`, so playing, pausing or loading the poster causes no layout shift.

#### Scenario: Reserved box

- GIVEN the loop tile before any media loads
- WHEN its box is read
- THEN it declares an aspect ratio (4:5 on phones) and the poster has width and height attributes

#### Scenario: Not high priority

- GIVEN the loop poster and video elements
- WHEN their priority attributes are read
- THEN neither has `fetchpriority="high"` nor `loading="eager"`, and no preload link points to them
