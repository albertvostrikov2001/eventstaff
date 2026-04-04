'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  vacancyCreateSchema,
  type VacancyCreateInput,
  STAFF_CATEGORIES,
  EVENT_TYPES,
  EMPLOYMENT_TYPES,
  RATE_TYPES,
} from '@unity/shared';
import { FormField, FormTextarea, FormSelect, FormCheckbox } from '@/components/forms/FormField';

interface City { id: string; name: string }

interface VacancyFormProps {
  defaultValues?: Partial<VacancyCreateInput & { status: string }>;
  cities: City[];
  onSubmit: (data: VacancyCreateInput & { status: string }) => Promise<void>;
  submitLabel?: string;
}

const CATEGORY_OPTIONS = Object.entries(STAFF_CATEGORIES).map(([value, label]) => ({ value, label }));
const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }));
const EMPLOYMENT_TYPE_OPTIONS = Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => ({ value, label }));
const RATE_TYPE_OPTIONS = Object.entries(RATE_TYPES).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'active', label: 'Активна' },
];

export function VacancyForm({ defaultValues, cities, onSubmit, submitLabel = 'Сохранить' }: VacancyFormProps) {
  const form = useForm<VacancyCreateInput & { status: string }>({
    resolver: zodResolver(vacancyCreateSchema),
    defaultValues: {
      workersNeeded: 1,
      foodProvided: false,
      transportProvided: false,
      isUrgent: false,
      rateType: 'hourly',
      employmentType: 'single_shift',
      ...defaultValues,
      status: defaultValues?.status ?? 'draft',
    },
  });

  const cityOptions = cities.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Основная информация</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              label="Название вакансии"
              placeholder="Официант на банкет"
              required
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />
          </div>
          <FormSelect
            label="Категория"
            options={CATEGORY_OPTIONS}
            placeholder="Выберите категорию"
            required
            error={form.formState.errors.category?.message}
            {...form.register('category')}
          />
          <FormSelect
            label="Тип мероприятия"
            options={EVENT_TYPE_OPTIONS}
            placeholder="Выберите тип"
            error={(form.formState.errors as Record<string, { message?: string }>)['eventType']?.message}
            {...form.register('eventType')}
          />
          <FormSelect
            label="Тип занятости"
            options={EMPLOYMENT_TYPE_OPTIONS}
            required
            error={form.formState.errors.employmentType?.message}
            {...form.register('employmentType')}
          />
          <FormSelect
            label="Город"
            options={cityOptions}
            placeholder="Выберите город"
            error={(form.formState.errors as Record<string, { message?: string }>)['cityId']?.message}
            {...form.register('cityId')}
          />
          <FormField
            label="Ставка"
            type="number"
            min={0}
            required
            error={form.formState.errors.rate?.message}
            {...form.register('rate', { valueAsNumber: true })}
          />
          <FormSelect
            label="Тип оплаты"
            options={RATE_TYPE_OPTIONS}
            required
            error={form.formState.errors.rateType?.message}
            {...form.register('rateType')}
          />
          <FormField
            label="Дата начала"
            type="datetime-local"
            required
            error={form.formState.errors.dateStart?.message}
            {...form.register('dateStart')}
          />
          <FormField
            label="Дата окончания"
            type="datetime-local"
            {...form.register('dateEnd')}
          />
          <FormField
            label="Количество мест"
            type="number"
            min={1}
            error={form.formState.errors.workersNeeded?.message}
            {...form.register('workersNeeded', { valueAsNumber: true })}
          />
          <FormSelect
            label="Статус"
            options={STATUS_OPTIONS}
            {...form.register('status')}
          />
        </div>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Описание и требования</h2>
        <div className="space-y-4">
          <FormTextarea
            label="Описание"
            required
            placeholder="Опишите вакансию"
            rows={4}
            {...form.register('description')}
          />
          <FormTextarea
            label="Обязанности"
            placeholder="Что нужно будет делать"
            rows={3}
            {...form.register('responsibilities')}
          />
          <FormTextarea
            label="Требования"
            placeholder="Требования к кандидату"
            rows={3}
            {...form.register('requirements')}
          />
          <FormTextarea
            label="Условия"
            placeholder="Условия работы"
            rows={3}
            {...form.register('conditions')}
          />
        </div>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Дополнительно</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormCheckbox label="Питание предоставляется" {...form.register('foodProvided')} />
          <FormCheckbox label="Трансфер предоставляется" {...form.register('transportProvided')} />
          <FormCheckbox label="Срочная вакансия" {...form.register('isUrgent')} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="rounded-input bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
        >
          {form.formState.isSubmitting ? 'Сохраняем...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
