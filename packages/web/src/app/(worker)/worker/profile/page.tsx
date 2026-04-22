'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workerProfileUpdateSchema, type WorkerProfileUpdateInput, STAFF_CATEGORIES } from '@unity/shared';
import { FormField, FormTextarea, FormSelect, FormCheckbox } from '@/components/forms/FormField';
import { useToast } from '@/components/ui/toast-context';
import { apiClient } from '@/lib/api/client';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface WorkerProfile {
  id: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  experienceYears: number;
  hasMedicalBook: boolean;
  willingToTravel: boolean;
  overtimeReady: boolean;
  readyForTrips: boolean;
  readyForOvertime: boolean;
  desiredRate: string | null;
  rateType: string | null;
  visibility: string;
  cityId: string | null;
  categories: { id: string; category: string; level: string }[];
}

const CATEGORY_OPTIONS = Object.entries(STAFF_CATEGORIES).map(([value, label]) => ({
  value,
  label,
}));

const RATE_TYPE_OPTIONS = [
  { value: 'hourly', label: 'В час' },
  { value: 'per_shift', label: 'За смену' },
  { value: 'fixed', label: 'Фиксированная' },
];

export default function WorkerProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const form = useForm<WorkerProfileUpdateInput>({
    resolver: zodResolver(workerProfileUpdateSchema),
  });

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: WorkerProfile }>('/worker/profile'),
      apiClient.get<{ data: City[] }>('/catalog/cities'),
    ])
      .then(([profileRes, citiesRes]) => {
        const p = profileRes.data;
        setProfile(p);
        setCities(citiesRes.data);
        form.reset({
          firstName: p.firstName,
          lastName: p.lastName,
          bio: p.bio ?? undefined,
          experienceYears: p.experienceYears,
          hasMedicalBook: p.hasMedicalBook,
          willingToTravel: p.willingToTravel,
          overtimeReady: p.overtimeReady,
          readyForTrips: p.readyForTrips,
          readyForOvertime: p.readyForOvertime,
          desiredRate: p.desiredRate ? Number(p.desiredRate) : undefined,
          rateType: (p.rateType as WorkerProfileUpdateInput['rateType']) ?? 'hourly',
          visibility: (p.visibility as WorkerProfileUpdateInput['visibility']) ?? 'hidden',
          cityId: p.cityId ?? undefined,
        });
      })
      .catch(() => toast('Не удалось загрузить профиль', 'error'))
      .finally(() => setLoading(false));
  }, [form, toast]);

  const onSubmit = async (data: WorkerProfileUpdateInput) => {
    try {
      const res = await apiClient.put<{ data: WorkerProfile }>('/worker/profile', data);
      setProfile(res.data);
      toast('Профиль сохранён', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      toast(msg, 'error');
    }
  };

  const toggleVisibility = async () => {
    if (!profile) return;
    setTogglingVisibility(true);
    try {
      const newVisibility = profile.visibility === 'public' ? 'hidden' : 'public';
      const res = await apiClient.put<{ data: WorkerProfile }>('/worker/profile', {
        visibility: newVisibility,
      });
      setProfile(res.data);
      toast(
        newVisibility === 'public' ? 'Анкета опубликована' : 'Анкета скрыта',
        'success',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка изменения видимости';
      toast(msg, 'error');
    } finally {
      setTogglingVisibility(false);
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
  const isPublic = profile?.visibility === 'public';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Мой профиль</h1>
          <p className="mt-1 text-sm text-white/50">Заполните анкету для поиска работы</p>
        </div>
        <button
          onClick={toggleVisibility}
          disabled={togglingVisibility}
          className={`flex items-center gap-2 rounded-input px-4 py-2 text-sm font-medium transition ${
            isPublic
              ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {isPublic ? 'Анкета видна' : 'Анкета скрыта'}
        </button>
      </div>

      {!isPublic && (
        <div className="flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Ваша анкета скрыта. Заполните имя, фамилию, город, категорию и ставку, затем
            нажмите &quot;Анкета скрыта&quot; для публикации.
          </p>
        </div>
      )}

      {isPublic && (
        <div className="flex items-start gap-3 rounded-card border border-green-200 bg-green-50 p-4">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-sm text-green-800">
            Ваша анкета опубликована и видна работодателям.
          </p>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Основная информация</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Имя"
              required
              error={form.formState.errors.firstName?.message}
              {...form.register('firstName')}
            />
            <FormField
              label="Фамилия"
              required
              error={form.formState.errors.lastName?.message}
              {...form.register('lastName')}
            />
            <FormSelect
              label="Город"
              options={cityOptions}
              placeholder="Выберите город"
              error={form.formState.errors.cityId?.message}
              {...form.register('cityId')}
            />
            <FormSelect
              label="Специализация"
              options={CATEGORY_OPTIONS}
              placeholder="Выберите категорию"
              {...form.register('categories' as keyof WorkerProfileUpdateInput)}
            />
            <FormField
              label="Желаемая ставка"
              type="number"
              min={0}
              error={form.formState.errors.desiredRate?.message}
              {...form.register('desiredRate', { valueAsNumber: true })}
            />
            <FormSelect
              label="Тип ставки"
              options={RATE_TYPE_OPTIONS}
              error={form.formState.errors.rateType?.message}
              {...form.register('rateType')}
            />
            <FormField
              label="Опыт (лет)"
              type="number"
              min={0}
              max={50}
              error={form.formState.errors.experienceYears?.message}
              {...form.register('experienceYears', { valueAsNumber: true })}
            />
          </div>

          <div className="mt-4">
            <FormTextarea
              label="О себе"
              placeholder="Расскажите о себе, опыте и навыках"
              rows={4}
              error={form.formState.errors.bio?.message}
              {...form.register('bio')}
            />
          </div>

          <div className="mt-4 space-y-3">
            <FormCheckbox
              label="Есть медицинская книжка"
              {...form.register('hasMedicalBook')}
            />
            <FormCheckbox
              label="Готов к командировкам"
              {...form.register('willingToTravel')}
            />
            <FormCheckbox
              label="Готов к сверхурочной работе"
              {...form.register('overtimeReady')}
            />
            <FormCheckbox
              label="Готов к выездам (мероприятия вне города)"
              {...form.register('readyForTrips')}
            />
            <FormCheckbox
              label="Готов к овертаймам (доп. часы в день смены)"
              {...form.register('readyForOvertime')}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  );
}
