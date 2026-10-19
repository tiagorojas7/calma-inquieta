import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  removeIntersectionObserver,
  restoreBrowserStubs,
  spyOnPlayback,
  stubConnection,
  stubIntersectionObserver,
  stubMatchMedia,
} from "~/testing/ui/browser-stubs";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { VideoLoop } from "./video-loop";

const props = {
  poster: {
    src: "/media/video/home-loop-poster-720.0a1b2c3d.webp",
    srcSet:
      "/media/video/home-loop-poster-480.0a1b2c3d.webp 480w, /media/video/home-loop-poster-720.0a1b2c3d.webp 720w",
    width: 720,
    height: 900,
  },
  sizes: "calc(100vw - 2.5rem)",
  sources: [
    { src: "/media/video/home-loop-720.0a1b2c3d.webm", type: "video/webm" },
    { src: "/media/video/home-loop-720.0a1b2c3d.mp4", type: "video/mp4" },
  ],
  width: 720,
  height: 900,
};

const PAUSE = "Pausar animación";
const PLAY = "Reproducir animación";

let observer: ReturnType<typeof stubIntersectionObserver>;
let media: ReturnType<typeof stubMatchMedia>;
let playback: ReturnType<typeof spyOnPlayback>;

beforeEach(() => {
  observer = stubIntersectionObserver();
  media = stubMatchMedia();
  playback = spyOnPlayback();
});

afterEach(() => {
  restoreBrowserStubs();
});

function renderLoop() {
  return render(<VideoLoop {...props} />);
}

/** Renders the loop and lets it enter the viewport with motion allowed. */
function renderPlaying() {
  const view = renderLoop();
  observer.trigger(true);
  return view;
}

function videoOf(container: HTMLElement) {
  return container.querySelector("video");
}

describe("VideoLoop", () => {
  it("server markup has a lazy poster with empty alt and no video element", () => {
    const markup = renderToStaticMarkup(<VideoLoop {...props} />);
    expect(markup).not.toContain("<video");
    expect(markup).not.toContain("<button");
    expect(markup).toContain("<img");
    expect(markup).toContain('alt=""');
    expect(markup).toContain('loading="lazy"');
    expect(markup).not.toContain("fetchPriority");
    expect(markup).not.toContain("fetchpriority");
  });

  it("reduce on mount mounts no video, never calls play and renders no button", () => {
    media.setReduce(true);
    const { container } = renderLoop();
    observer.trigger(true);
    expect(videoOf(container)).toBeNull();
    expect(playback.play).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("Save-Data on behaves like reduce", () => {
    stubConnection(true);
    const { container } = renderLoop();
    observer.trigger(true);
    expect(videoOf(container)).toBeNull();
    expect(playback.play).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("unavailable Save-Data does not block playback", () => {
    stubConnection(undefined);
    const { container } = renderPlaying();
    expect(videoOf(container)).not.toBeNull();
    expect(playback.play).toHaveBeenCalledTimes(1);
  });

  it("Save-Data off does not block playback", () => {
    stubConnection(false);
    const { container } = renderPlaying();
    expect(videoOf(container)).not.toBeNull();
    expect(playback.play).toHaveBeenCalledTimes(1);
  });

  it("without IntersectionObserver the poster stays and no button renders", () => {
    removeIntersectionObserver();
    const { container } = renderLoop();
    expect(videoOf(container)).toBeNull();
    expect(playback.play).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("does not mount the video before the tile intersects", () => {
    const { container } = renderLoop();
    expect(videoOf(container)).toBeNull();
    expect(playback.play).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("intersecting with motion allowed mounts a muted looping playsInline video with preload none, aria-hidden and tabindex -1, WebM source before MP4", () => {
    const { container } = renderPlaying();
    const video = videoOf(container);
    expect(video).not.toBeNull();
    if (!video) return;
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("aria-hidden", "true");
    expect(video).toHaveAttribute("tabindex", "-1");
    expect(video).not.toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("autoplay");
    const sources = [...video.querySelectorAll("source")];
    expect(sources.map((source) => source.getAttribute("type"))).toEqual([
      "video/webm",
      "video/mp4",
    ]);
    expect(sources.map((source) => source.getAttribute("src"))).toEqual(
      props.sources.map(({ src }) => src),
    );
    for (const source of sources) {
      const url = new URL(source.getAttribute("src") ?? "", document.baseURI);
      expect(url.origin).toBe(window.location.origin);
    }
    expect(video).toHaveClass("opacity-0");
    fireEvent.playing(video);
    expect(video).toHaveClass("opacity-100");
  });

  it("play is called once on entering the viewport", () => {
    renderPlaying();
    expect(playback.play).toHaveBeenCalledTimes(1);
    expect(playback.pause).not.toHaveBeenCalled();
  });

  it("pause is called on leaving the viewport", () => {
    renderPlaying();
    observer.trigger(false);
    expect(playback.pause).toHaveBeenCalled();
    expect(playback.play).toHaveBeenCalledTimes(1);
  });

  it("plays again when the tile re-enters the viewport", () => {
    renderPlaying();
    observer.trigger(false);
    observer.trigger(true);
    expect(playback.play).toHaveBeenCalledTimes(2);
  });

  it("a rejected play keeps the poster without an unhandled rejection", async () => {
    playback.play.mockRejectedValue(
      new DOMException("blocked", "NotAllowedError"),
    );
    const { container } = renderPlaying();
    await act(async () => {
      await Promise.resolve();
    });
    expect(playback.play).toHaveBeenCalledTimes(1);
    expect(container.querySelector("img")).not.toBeNull();
    expect(videoOf(container)).toHaveClass("opacity-0");
  });

  it("a media error removes the video and keeps the poster", () => {
    const { container } = renderPlaying();
    const video = videoOf(container);
    expect(video).not.toBeNull();
    if (!video) return;
    fireEvent.error(video);
    expect(videoOf(container)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("an error of the last source removes the video; an error of the first source does not", () => {
    const { container } = renderPlaying();
    const [first, last] = [...container.querySelectorAll("source")];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    if (!first || !last) return;
    fireEvent.error(first);
    expect(videoOf(container)).not.toBeNull();
    fireEvent.error(last);
    expect(videoOf(container)).toBeNull();
  });

  it("reduce turning on during playback unmounts the video and the button", () => {
    const { container } = renderPlaying();
    expect(videoOf(container)).not.toBeNull();
    expect(screen.getByRole("button", { name: PAUSE })).toBeInTheDocument();
    media.setReduce(true);
    expect(videoOf(container)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("the pause button is named Pausar animación, has a 44px target and is the only focusable element", () => {
    const { container } = renderPlaying();
    const button = screen.getByRole("button", { name: PAUSE });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("size-11");
    const focusable = container.querySelectorAll(
      'a[href], button, input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])',
    );
    expect([...focusable]).toEqual([button]);
  });

  it("a user pause persists across leaving and re-entering and the name becomes Reproducir animación", () => {
    renderPlaying();
    fireEvent.click(screen.getByRole("button", { name: PAUSE }));
    expect(playback.pause).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: PLAY })).toBeInTheDocument();
    observer.trigger(false);
    observer.trigger(true);
    expect(playback.play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: PLAY })).toBeInTheDocument();
  });

  it("resuming restores playback and the name", () => {
    renderPlaying();
    fireEvent.click(screen.getByRole("button", { name: PAUSE }));
    fireEvent.click(screen.getByRole("button", { name: PLAY }));
    expect(playback.play).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: PAUSE })).toBeInTheDocument();
  });

  it("the wrapper is not aria-hidden", () => {
    const { container } = renderPlaying();
    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper).not.toHaveAttribute("aria-hidden");
    expect(container.querySelector("img")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("the poster is neither eager nor high priority", () => {
    const { container } = renderPlaying();
    const poster = container.querySelector("img");
    expect(poster).toHaveAttribute("loading", "lazy");
    expect(poster).not.toHaveAttribute("fetchpriority");
    expect(poster).toHaveAttribute("alt", "");
    expect(poster).toHaveAttribute("src", props.poster.src);
    expect(poster).toHaveAttribute("srcset", props.poster.srcSet);
    expect(poster).toHaveAttribute("sizes", props.sizes);
    expect(videoOf(container)).not.toHaveAttribute("fetchpriority");
    expect(container.querySelector('[loading="eager"]')).toBeNull();
  });

  it("the tile reserves its aspect ratio", () => {
    const { container } = renderLoop();
    expect(container.firstElementChild).toHaveStyle({
      aspectRatio: "720 / 900",
    });
    const poster = container.querySelector("img");
    expect(poster).toHaveAttribute("width", "720");
    expect(poster).toHaveAttribute("height", "900");
  });

  it("merges the caller classes onto the wrapper", () => {
    const { container } = render(<VideoLoop {...props} className="lg:w-40" />);
    expect(container.firstElementChild).toHaveClass("lg:w-40");
  });

  it("has no axe violations", async () => {
    const { container } = renderLoop();
    await expectNoAxeViolations(container);
    observer.trigger(true);
    expect(videoOf(container)).not.toBeNull();
    await expectNoAxeViolations(container);
  });
});
