import { useState } from "react";
import { Icon } from "../atoms/icon";
import { Image } from "../atoms/image";
import { microcopy } from "../microcopy";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

interface VideoEntry {
  readonly youtubeId: string;
  readonly title: string;
  readonly poster: {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
}

export function VideoFacade({ video }: { video: VideoEntry }) {
  const [active, setActive] = useState(false);
  if (!YOUTUBE_ID.test(video.youtubeId)) return null;
  if (active) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
        title={video.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      aria-label={microcopy.playVideo(video.title)}
      onClick={() => {
        setActive(true);
      }}
    >
      <Image {...video.poster} />
      <Icon name="play" />
    </button>
  );
}
