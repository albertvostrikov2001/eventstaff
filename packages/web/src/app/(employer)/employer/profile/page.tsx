'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employerProfileUpdateSchema, type EmployerProfileUpdateInput, BUSINESS_TYPES } from '@unity/shared';
import { FormField, FormTextarea, FormSelect } from '@/components/forms/FormField';
import { useToast } from '@/components/ui/toast-context';
import { apiClient } from '@/lib/api/client';
import { ShieldCheck, Shield } from 'lucide-react';

interface City { id: string; name: string }
interface EmployerProfile {
  id: string;
  type: string;
  companyName: string | null;
  contactName: string | null;
  description: string | null;
  businessType: string;
  website: string | null;
  cityId: string | null;
  isVerified: boolean;
  city?: { id: string; name: string } | null;
}

const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPES).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS = [
  { value: 'company', label: 'Компания' },
  { value: 'individual', label: 'Частное лицо' },
];

export default function EmployerProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<EmployerProfileUpdateInput>({
    resolver: zodResolver(employerProfileUpdateSchema),
  });

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: EmployerProfile }>('/employer/profile'),
      apiClient.get<{ data: City[] }>('/catalog/cities'),
    ])
      .then(([profileRes, citiesRes]) => {
        const p = profileRes.data;
        setProfile(p);
        setCities(citiesRes.data);
        form.reset({
          type: (p.type as EmployerProfileUpdateInput['type']) ?? 'company',
          companyName: p.companyName ?? undefined,
          contactName: p.contactName ?? undefined,
          description: p.description ?? undefined,
          businessType: (p.businessType as EmployerProfileUpdateInput['businessType']) ?? 'other',
          website: p.website ?? undefined,
          cityId: p.cityId ?? undefined,
        });
      })
      .catch(() => toast('Ошибка загрузки профиля', 'error'))
      .finally(() => setLoading(false));
  }, [form, toast]);

  const onSubmit = async (data: EmployerProfileUpdateInput) => {
    try {
      const res = await apiClient.put<{ data: EmployerProfile }>('/employer/profile', data);
      setProfile(res.data);
      toast('Профиль сохранён', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-card bg-gray-200" />
        ))}
      </div>
    );
  }

  const cityOptions = cities.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Профиль компании</h1>
          <p className="mt-1 text-sm text-gray-500">Информация о вашей организации</p>
        </div>
        {profile && (
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
              profile.isVerified
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {profile.isVerified ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            {profile.isVerified ? 'Верифицирован' : 'Не верифицирован'}
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Основные данные</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Тип"
              options={TYPE_OPTIONS}
              error={form.formState.errors.type?.message}
              {...form.register('type')}
            />
            <FormSelect
              label="Тип бизнеса"
              options={BUSINESS_TYPE_OPTIONS}
              placeholder="Выберите тип"
              error={form.formState.errors.businessType?.message}
              {...form.register('businessType')}
            />
            <FormField
              label="Название компании"
              placeholder="ООО Ресторан"
              error={form.formState.errors.companyName?.message}
              {...form.register('companyName')}
            />
            <FormField
              label="Контактное лицо"
              placeholder="Имя Фамилия"
              error={form.formState.errors.contactName?.message}
              {...form.register('contactName')}
            />
            <FormSelect
              label="Город"
              options={cityOptions}
              placeholder="Выберите город"
              error={form.formState.errors.cityId?.message}
              {...form.register('cityId')}
            />
            <FormField
              label="Сайт"
              type="url"
              placeholder="https://example.com"
              error={form.formState.errors.website?.message}
              {...form.register('website')}
            />
          </div>
          <div className="mt-4">
            <FormTextarea
              label="Описание"
              placeholder="Расскажите о вашей компании и мероприятиях"
              rows={4}
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
