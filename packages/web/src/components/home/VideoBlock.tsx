'use client';

import { useState, useRef } from 'react';
import { Play } from 'lucide-react';

interface VideoBlockProps {
  src?: string;
  poster?: string;
  caption?: string;
}

export function VideoBlock({
  src = '/assets/platform-intro.mp4',
  poster = '/assets/video-poster.svg',
  caption = 'Узнать о платформе за 2 минуты',
}: VideoBlockProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play();
    setIsPlaying(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-[540px]">
      <div className="video-wrapper">
        {!isLoaded && <div className="video-skeleton" aria-hidden="true" />}

        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          poster={poster}
          muted
          playsInline
          preload="none"
          aria-label={caption}
          onCanPlay={() => setIsLoaded(true)}
          onEnded={handleEnded}
        >
          <source src={src} type="video/mp4" />
        </video>

        {!isPlaying && (
          <button
            className="video-play-btn"
            onClick={handlePlay}
            aria-label="Воспроизвести видео"
          >
            <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
          </button>
        )}
      </div>

      <p className="video-caption">{caption}</p>
    </div>
  );
}
