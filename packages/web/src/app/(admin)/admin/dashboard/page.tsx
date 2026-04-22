'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import {
  Users,
  FileText,
  ClipboardList,
  ShieldCheck,
  MessageSquareWarning,
  ImagePlus,
  Inbox,
  Shield,
} from 'lucide-react';

interface Stats {
  users: number;
  activeVacancies: number;
  applications: number;
  verifiedEmployers: number;
}

interface AlertSummary {
  newComplaints: number;
  pendingMedia: number;
  newIndividualRequests: number;
  restrictedUsers: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: Stats }>('/admin/stats'),
      apiClient.get<{ data: AlertSummary }>('/admin/dashboard-summary'),
    ])
      .then(([a, b]) => {
        setStats(a.data);
        setAlerts(b.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    { label: 'Пользователей', value: stats?.users ?? 0, icon: Users, color: 'text-sky-300 bg-white/10' },
    { label: 'Активных вакансий', value: stats?.activeVacancies ?? 0, icon: FileText, color: 'text-emerald-300 bg-white/10' },
    { label: 'Откликов', value: stats?.applications ?? 0, icon: ClipboardList, color: 'text-violet-300 bg-white/10' },
    { label: 'Верифицировано', value: stats?.verifiedEmployers ?? 0, icon: ShieldCheck, color: 'text-amber-200 bg-white/10' },
  ];

  const tiles = [
    {
      href: '/admin/complaints',
      label: 'Новые и активные жалобы',
      value: alerts?.newComplaints ?? 0,
      icon: MessageSquareWarning,
    },
    {
      href: '/admin/media/pending',
      label: 'Медиа на модерации',
      value: alerts?.pendingMedia ?? 0,
      icon: ImagePlus,
    },
    {
      href: '/admin/individual-requests',
      label: 'Персональные заявки (новые)',
      value: alerts?.newIndividualRequests ?? 0,
      icon: Inbox,
    },
    {
      href: '/admin/users',
      label: 'Пользователи с ограничением',
      value: alerts?.restrictedUsers ?? 0,
      icon: Shield,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Панель администратора</h1>
      <p className="mt-1 text-sm text-white/50">Сводка и ссылки в разделы</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center justify-between rounded-input border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90 transition hover:border-white/20"
          >
            <span className="flex items-center gap-2">
              <t.icon className="h-4 w-4 text-primary-300" />
              {t.label}
            </span>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-100">
              {loading ? '—' : t.value}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-input border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{loading ? '—' : m.value}</div>
                <div className="text-xs text-white/50">{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
