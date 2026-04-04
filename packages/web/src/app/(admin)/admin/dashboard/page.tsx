'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Users, FileText, ClipboardList, ShieldCheck } from 'lucide-react';

interface Stats {
  users: number;
  activeVacancies: number;
  applications: number;
  verifiedEmployers: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<{ data: Stats }>('/admin/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    { label: 'Пользователей', value: stats?.users ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Активных вакансий', value: stats?.activeVacancies ?? 0, icon: FileText, color: 'text-primary-600 bg-primary-50' },
    { label: 'Откликов', value: stats?.applications ?? 0, icon: ClipboardList, color: 'text-purple-600 bg-purple-50' },
    { label: 'Верифицировано', value: stats?.verifiedEmployers ?? 0, icon: ShieldCheck, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Панель администратора</h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{loading ? '—' : m.value}</div>
                <div className="text-xs text-gray-500">{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
