'use client';

import Link from 'next/link';
import {
  UserCog,
  Eye,
  Mail,
  CalendarCheck,
  Search,
  Hourglass,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  profileFilled: boolean;
  isPublic: boolean;
  applicationsCount: number;
  pendingInvitations: number;
  activeShifts: number;
}

interface Step {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
  cta: string;
}

/**
 * Single, always-visible "what to do next" hint for the worker.
 * Picks the most relevant next action based on the current stage, so the
 * user is never left guessing what to do after each step.
 */
function resolveStep(p: Props): Step {
  if (!p.profileFilled) {
    return {
      key: 'profile',
      icon: UserCog,
      title: 'Шаг 1. Заполните профиль',
      desc: 'Укажите имя, город и специализацию — без этого работодатели вас не увидят, а откликаться нельзя.',
      href: '/worker/profile',
      cta: 'Заполнить профиль',
    };
  }
  if (!p.isPublic) {
    return {
      key: 'publish',
      icon: Eye,
      title: 'Шаг 2. Сделайте анкету публичной',
      desc: 'Откройте анкету — тогда работодатели смогут находить вас в каталоге и присылать приглашения.',
      href: '/worker/profile',
      cta: 'Открыть анкету',
    };
  }
  if (p.pendingInvitations > 0) {
    return {
      key: 'invitations',
      icon: Mail,
      title: 'Вас пригласили на вакансию',
      desc: `У вас ${p.pendingInvitations} ${p.pendingInvitations === 1 ? 'новое приглашение' : 'новых приглашения'}. Ответьте работодателю — примите или отклоните.`,
      href: '/worker/invitations',
      cta: 'Ответить на приглашение',
    };
  }
  if (p.activeShifts > 0) {
    return {
      key: 'shifts',
      icon: CalendarCheck,
      title: 'У вас назначена смена',
      desc: 'Подтвердите участие в смене, а после выхода отметьте её выполненной — это влияет на ваш рейтинг.',
      href: '/worker/shifts',
      cta: 'Перейти к сменам',
    };
  }
  if (p.applicationsCount === 0) {
    return {
      key: 'apply',
      icon: Search,
      title: 'Шаг 3. Откликнитесь на первую вакансию',
      desc: 'Профиль готов! Найдите подходящую смену в каталоге и откликнитесь — работодатель свяжется с вами.',
      href: '/vacancies',
      cta: 'Найти вакансии',
    };
  }
  return {
    key: 'waiting',
    icon: Hourglass,
    title: 'Отклики на рассмотрении',
    desc: 'Работодатели просматривают ваши отклики. Чтобы быстрее получить работу — откликнитесь ещё на несколько вакансий.',
    href: '/vacancies',
    cta: 'Откликнуться ещё',
  };
}

export function NextStepHint(props: Props) {
  const step = resolveStep(props);
  const Icon = step.icon;
  return (
    <div className="mt-6 overflow-hidden rounded-[14px] border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/[0.10] to-white/[0.02] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/20">
            <Icon className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                Что дальше
              </span>
            </div>
            <h3 className="mt-0.5 text-base font-semibold text-white">{step.title}</h3>
            <p className="mt-1 max-w-xl text-sm text-white/60">{step.desc}</p>
          </div>
        </div>
        <Link
          href={step.href}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:opacity-90"
        >
          {step.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
