"use client";

import { useMemo } from "react";

interface VideoBackgroundProps {
  videoUrl?: string | null;
  videoType?: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export function VideoBackground({ videoUrl }: VideoBackgroundProps) {
  const youtubeId = useMemo(() => {
    if (!videoUrl) return null;
    return extractYouTubeId(videoUrl);
  }, [videoUrl]);

  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden select-none">
      {/* Background Video */}
      {videoUrl ? (
        youtubeId ? (
          <div className="relative h-full w-full overflow-hidden">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&playsinline=1&enablejsapi=1`}
              title="Arrière-plan vidéo"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 border-0 object-cover"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              tabIndex={-1}
            />
          </div>
        ) : (
          <video
            key={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          >
            <source src={videoUrl} />
          </video>
        )
      ) : (
        /* Fallback Ambiance Gradient */
        <div className="h-full w-full bg-linear-to-br from-neutral-950 via-neutral-900 to-black animate-pulse duration-10000" />
      )}

      {/* Cinematic Dark Overlays for contrast & elegance */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_20%,rgba(0,0,0,0.85)_100%] z-[1]" />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1.5px] z-[2]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40 z-[3]" />
    </div>
  );
}
