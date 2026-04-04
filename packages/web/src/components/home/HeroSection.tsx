import Link from 'next/link';
import { Users, Briefcase } from 'lucide-react';
import { VideoBlock } from './VideoBlock';
import { heroContent } from '@/content/heroContent';

export function HeroSection() {
  const { badge, h1, subtitle, cta1Label, cta1Href, cta2Label, cta2Href, trustItems } =
    heroContent;

  const h1Lines = h1.split('\n');

  return (
    <section className="hero-section" aria-label="Главный экран">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-dots" aria-hidden="true" />

      <div className="container-page relative z-10 w-full py-20 lg:py-0">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[55fr_45fr]">

          {/* ── Left column ── */}
          <div>
            {/* Geo badge */}
            <div className="hero-badge" role="status" aria-label="Регион работы">
              <span className="badge-dot" aria-hidden="true" />
              <span>{badge}</span>
            </div>

            {/* H1 */}
            <h1 className="hero-h1">
              {h1Lines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < h1Lines.length - 1 && <br />}
                </span>
              ))}
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle">{subtitle}</p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <Link href={cta1Href} className="btn-hero-primary">
                <Users className="h-5 w-5" aria-hidden="true" />
                {cta1Label}
              </Link>
              <Link href={cta2Href} className="btn-hero-secondary">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
                {cta2Label}
              </Link>
            </div>

            {/* Trust line */}
            <div className="trust-line mt-6">
              {trustItems.map((item, i) => (
                <span key={item} className="flex items-center gap-1">
                  {i > 0 && <span className="trust-sep hidden sm:inline">·</span>}
                  <span>
                    <span className="trust-check">✓</span>
                    {item}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Right column — video (desktop) ── */}
          <div className="hidden lg:flex lg:justify-center lg:items-center">
            <VideoBlock />
          </div>
        </div>

        {/* Mobile video — below text */}
        <div className="mt-10 lg:hidden">
          <VideoBlock />
        </div>
      </div>
    </section>
  );
}
