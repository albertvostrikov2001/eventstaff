'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, Volume2, VolumeX } from 'lucide-react';
import { publicAssetUrl } from '@/lib/public-asset-url';

interface VideoBlockProps {
  src?: string;
  poster?: string;
  caption?: string;
}

export function VideoBlock({
  src     = '/assets/platform-intro.mp4',
  poster  = '/assets/video-poster.jpg',
  caption = 'Узнать о платформе за 1 минуту',
}: VideoBlockProps) {
  const videoSrc  = publicAssetUrl(src);
  const posterSrc = publicAssetUrl(poster);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing,  setIsClosing]  = useState(false);
  const [isMuted,    setIsMuted]    = useState(false);
  const [mounted,    setMounted]    = useState(false);

  const expandedVideoRef = useRef<HTMLVideoElement>(null);

  /* Portal requires browser */
  useEffect(() => { setMounted(true); }, []);

  /* Auto-play when expanded (useEffect preserves user-gesture chain in modern browsers) */
  useEffect(() => {
    if (isExpanded && !isClosing && expandedVideoRef.current) {
      expandedVideoRef.current.play().catch(() => {
        /* Autoplay blocked — browser will show native controls for manual start */
      });
    }
  }, [isExpanded, isClosing]);

  /* Close on Escape */
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isExpanded]);

  /* Lock body scroll while player is open */
  useEffect(() => {
    document.body.style.overflow = (isExpanded && !isClosing) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isExpanded, isClosing]);

  const handleOpen = () => {
    setIsClosing(false);
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsClosing(true);
    expandedVideoRef.current?.pause();
    setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
    }, 260);
  };

  const toggleMute = () => {
    if (expandedVideoRef.current) {
      const next = !isMuted;
      expandedVideoRef.current.muted = next;
      setIsMuted(next);
    }
  };

  return (
    <>
      {/* ── In-page thumbnail (always in document flow) ─────────────────── */}
      <div className="w-full max-w-[540px]">
        <div
          className="video-wrapper cursor-pointer group"
          onClick={handleOpen}
          role="button"
          tabIndex={0}
          aria-label="Воспроизвести видео"
          onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
        >
          {/* Poster thumbnail */}
          {posterSrc && (
            <img
              src={posterSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {/* Play button */}
          <button
            className="video-play-btn"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
          </button>
        </div>

        <p className="video-caption">{caption}</p>
      </div>

      {/* ── Expanded floating player (portal, no backdrop) ───────────────── */}
      {isExpanded && mounted && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-label="Видеоплеер"
        >
          {/* Invisible click-outside area */}
          <div
            className="absolute inset-0 cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.15)' }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Video card */}
          <div
            className="relative w-[min(90vw,1000px)] overflow-hidden rounded-[18px] border border-white/[0.12] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
            style={{
              background: '#060d09',
              animation: isClosing
                ? 'videoCollapse 0.26s cubic-bezier(0.36,0,0.66,0) both'
                : 'videoExpand 0.36s cubic-bezier(0.34,1.4,0.64,1) both',
              zIndex: 1,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* The actual video */}
            <video
              ref={expandedVideoRef}
              className="block w-full"
              style={{ aspectRatio: '16/9', display: 'block' }}
              playsInline
              muted={isMuted}
              controls
              preload="auto"
              onEnded={handleClose}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>

            {/* Top bar with mute + close */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between px-4 py-3"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
              }}
            >
              <span className="text-[13px] font-medium text-white/70 pointer-events-none">
                {caption}
              </span>
              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                  aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                >
                  {isMuted
                    ? <VolumeX className="h-4 w-4" />
                    : <Volume2 className="h-4 w-4" />
                  }
                </button>
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                  aria-label="Закрыть видео (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
