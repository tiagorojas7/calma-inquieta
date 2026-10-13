import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { videoFixtures } from "~/testing/fixtures/ui";
import { expectNoAxeViolations } from "~/testing/ui/axe";
import { VideoFacade } from "./video-facade";

const [video] = videoFixtures;
const label = `Reproducir video: ${video.title}`;

describe("VideoFacade", () => {
  it("loads nothing from YouTube before activation", async () => {
    const { container } = render(<VideoFacade video={video} />);
    expect(container.querySelector("iframe")).toBeNull();
    for (const el of container.querySelectorAll("[src]")) {
      expect(el.getAttribute("src")).not.toMatch(/youtube|ytimg/);
    }
    expect(screen.getByRole("button", { name: label })).toBeVisible();
    expect(screen.getByRole("img", { name: video.poster.alt })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("renders the privacy-enhanced iframe on %s", async (_name, keys) => {
    const { container } = render(<VideoFacade video={video} />);
    screen.getByRole("button", { name: label }).focus();
    await userEvent.keyboard(keys);
    const frame = container.querySelector("iframe");
    expect(frame).toHaveAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`,
    );
    expect(frame).toHaveAttribute("title", video.title);
    expect(frame).toHaveAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture",
    );
    expect(frame).toHaveAttribute("allowfullscreen");
    await expectNoAxeViolations(container);
  });

  it("renders the iframe on click", () => {
    const { container } = render(<VideoFacade video={video} />);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it.each(["", "short", "has spaces!!", "toolongtoolongtoolong"])(
    "renders nothing for the invalid id %j",
    (youtubeId) => {
      const { container } = render(
        <VideoFacade video={{ ...video, youtubeId }} />,
      );
      expect(container).toBeEmptyDOMElement();
    },
  );
});
