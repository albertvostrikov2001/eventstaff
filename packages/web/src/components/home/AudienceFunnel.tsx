import Link from 'next/link';
import { Briefcase, UserCheck, CheckCircle2 } from 'lucide-react';
import { funnelContent } from '@/content/funnelContent';

interface FunnelPanelProps {
  side: 'employer' | 'worker';
  title: string;
  description: string;
  benefits: readonly string[];
  ctaLabel: string;
  ctaHref: string;
  iconColor: string;
  checkColor: string;
}

function FunnelPanel({
  side,
  title,
  description,
  benefits,
  ctaLabel,
  ctaHref,
  iconColor,
  checkColor,
}: FunnelPanelProps) {
  const Icon = side === 'employer' ? Briefcase : UserCheck;
  const panelClass = side === 'employer' ? 'funnel-employer' : 'funnel-worker';

  return (
    <div className={`funnel-panel ${panelClass}`}>
      <div className="funnel-icon-wrap" aria-hidden="true">
        <Icon
          className="h-12 w-12"
          strokeWidth={1.5}
          style={{ color: iconColor }}
        />
      </div>

      <h2 className="funnel-title">{title}</h2>

      <p className="funnel-desc">{description}</p>

      <ul className="funnel-benefits" aria-label="Преимущества">
        {benefits.map((benefit) => (
          <li key={benefit} className="funnel-benefit">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              strokeWidth={2}
              style={{ color: checkColor }}
              aria-hidden="true"
            />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <Link href={ctaHref} className="funnel-cta">
        {ctaLabel}
      </Link>
    </div>
  );
}

export function AudienceFunnel() {
  return (
    <section className="audience-funnel" aria-label="Для работодателей и соискателей">
      <FunnelPanel
        side="employer"
        title={funnelContent.employer.title}
        description={funnelContent.employer.description}
        benefits={funnelContent.employer.benefits}
        ctaLabel={funnelContent.employer.ctaLabel}
        ctaHref={funnelContent.employer.ctaHref}
        iconColor="#a8d5b5"
        checkColor="#6fcf97"
      />
      <FunnelPanel
        side="worker"
        title={funnelContent.worker.title}
        description={funnelContent.worker.description}
        benefits={funnelContent.worker.benefits}
        ctaLabel={funnelContent.worker.ctaLabel}
        ctaHref={funnelContent.worker.ctaHref}
        iconColor="#d5a88a"
        checkColor="#e8a87c"
      />
    </section>
  );
}
