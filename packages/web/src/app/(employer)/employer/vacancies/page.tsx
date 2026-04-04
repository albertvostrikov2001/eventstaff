'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { STAFF_CATEGORIES, VACANCY_STATUSES } from '@unity/shared';
import { Plus, FileText, MapPin, Users, Edit, Archive } from 'lucide-react';

interface Vacancy {
  id: string;
  title: string;
  category: string;
  rate: string;
  rateType: string;
  dateStart: string;
  status: string;
  city: { name: string } | null;
  _count: { applications: number };
}

const TABS = [
  { key: '', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'draft', label: 'Черновики' },
  { key: 'archived', label: 'Архив' },
];

export default function EmployerVacanciesPage() {
  const { toast } = useToast();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  const load = () => {
    setLoading(true);
    apiClient
      .get<{ data: Vacancy[] }>('/employer/vacancies', activeTab ? { status: activeTab } : undefined)
      .then((res) => setVacancies(res.data))
      .catch(() => toast('Ошибка загрузки вакансий', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeTab]);

  const archive = async (id: string) => {
    try {
      await apiClient.patch(`/employer/vacancies/${id}/archive`);
      setVacancies((prev) => prev.filter((v) => v.id !== id));
      toast('Вакансия архивирована', 'success');
    } catch {
      toast('Ошибка архивирования', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои вакансии</h1>
          <p className="mt-1 text-sm text-gray-500">Управляйте своими вакансиями</p>
        </div>
        <Link
          href="/employer/vacancies/new"
          className="flex items-center gap-2 rounded-input bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Создать вакансию
        </Link>
      </div>

      <div className="mt-6 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-card bg-gray-200" />
            ))}
          </div>
        ) : vacancies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-gray-200 bg-white py-16 text-center">
            <FileText className="h-10 w-10 text-gray-300" />
            <h3 className="font-semibold text-gray-900">Вакансий нет</h3>
            <p className="text-sm text-gray-500">Создайте первую вакансию</p>
            <Link
              href="/employer/vacancies/new"
              className="mt-2 rounded-input bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600"
            >
              Создать вакансию
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {vacancies.map((v) => (
              <div key={v.id} className="rounded-card border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/employer/vacancies/${v.id}/applications`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {v.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.status === 'active' ? 'bg-green-100 text-green-700' :
                        v.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {VACANCY_STATUSES[v.status as keyof typeof VACANCY_STATUSES] ?? v.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{STAFF_CATEGORIES[v.category as keyof typeof STAFF_CATEGORIES] ?? v.category}</span>
                      {v.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{v.city.name}
                        </span>
                      )}
                      <span className="font-medium text-gray-700">
                        {Number(v.rate).toLocaleString('ru-RU')} ₽/ч
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {v._count.applications} откликов
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/employer/vacancies/${v.id}/edit`}
                      className="flex items-center gap-1 rounded-input border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Edit className="h-3 w-3" />
                      Изменить
                    </Link>
                    {v.status !== 'archived' && (
                      <button
                        onClick={() => archive(v.id)}
                        className="flex items-center gap-1 rounded-input border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Archive className="h-3 w-3" />
                        В архив
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
