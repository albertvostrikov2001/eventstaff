'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import type { Resolver } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { addHours, isValid, parseISO, startOfMinute } from 'date-fns';
import { useMemo } from 'react';
import {
  EMPLOYMENT_TYPES,
  EVENT_TYPES,
  type VacancyCreateInput,
  RATE_TYPES,
  vacancyCreateSchema,
  STAFF_CATEGORIES,
  VACANCY_QUICK_TAGS,
} from '@unity/shared';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormDateTimePicker } from '@/components/forms/FormDateTimePicker';
import { FormField } from '@/components/forms/FormField';
import { FormRadio } from '@/components/forms/FormRadio';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextarea } from '@/components/forms/FormTextarea';
import {
  employerFormSectionShellClass,
  employerFormSectionTitleClass,
} from '@/components/forms/form-styles';

interface City {
  id: string;
  name: string;
}

interface VacancyFormProps {
  defaultValues?: Partial<VacancyCreateInput>;
  cities: City[];
  onSubmit: (data: VacancyCreateInput) => Promise<void> | void;
  /** Новая форма — черновик / публикация; правка — одна кнопка сохранения. */
  mode?: 'create' | 'edit';
  submitLabel?: string;
}

const CATEGORY_OPTIONS = Object.entries(STAFF_CATEGORIES).map(([value, label]) => ({
  value,
  label,
}));
const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPES).map(([value, label]) => ({ value, label }));
const RATE_TYPE_OPTIONS = Object.entries(RATE_TYPES).map(([value, label]) => ({ value, label }));

/** Три главных режима занятости по ТЗ интерфейса (остальные значения сохраним при редактировании). */
const PRIMARY_EMPLOYMENT_KEYS = ['single_shift', 'series', 'permanent'] as const;

function coerceVacancyEditFormStatus(raw?: string): VacancyCreateInput['status'] {
  if (raw === 'paused') return 'paused';
  if (raw === 'draft') return 'draft';
  return 'active';
}

export function VacancyForm({
  defaultValues,
  cities,
  onSubmit,
  mode = 'create',
  submitLabel,
}: VacancyFormProps) {
  const minStartLead = useMemo(() => addHours(startOfMinute(new Date()), 1), []);

  const form = useForm<VacancyCreateInput>({
    resolver: zodResolver(vacancyCreateSchema) as unknown as Resolver<VacancyCreateInput>,
    defaultValues: {
      workersNeeded: 1,
      foodProvided: false,
      transportProvided: false,
      isUrgent: false,
      rateType: 'hourly',
      employmentType: 'single_shift',
      tags: [],
      coverImageUrl: '',
      ...defaultValues,
      dateEnd:
        defaultValues?.dateEnd && defaultValues.dateEnd.trim() !== '' ? defaultValues.dateEnd : '',
      status:
        mode === 'edit'
          ? coerceVacancyEditFormStatus(defaultValues?.status as string | undefined)
          : 'draft',
    },
    mode: 'onChange',
  });

  const fv = form.formState.errors;

  const cityOptions = cities.map((c) => ({ value: c.id, label: c.name }));

  const dateStart = form.watch('dateStart');
  const parseStart = dateStart?.trim()
    ? (() => {
        const p = parseISO(dateStart);
        return isValid(p) ? p : undefined;
      })()
    : undefined;

  const submitDraft = () => {
    form.setValue('status', 'draft', { shouldValidate: true, shouldDirty: true });
    void form.handleSubmit(onSubmit)();
  };

  const submitPublish = () => {
    form.setValue('status', 'active', { shouldValidate: true, shouldDirty: true });
    void form.handleSubmit(onSubmit)();
  };

  const submitEdit = () => void form.handleSubmit(onSubmit)();

  const showExtraEmployment = !PRIMARY_EMPLOYMENT_KEYS.includes(
    form.watch('employmentType') as (typeof PRIMARY_EMPLOYMENT_KEYS)[number],
  );

  const effectiveSubmitLabel =
    submitLabel ??
    (mode === 'edit' ? 'Сохранить изменения' : undefined) ??
    (mode === 'create' ? 'Опубликовать' : 'Сохранить');

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <input type="hidden" {...form.register('status')} />
      <section className={employerFormSectionShellClass('cabinet')}>
        <h2 className={employerFormSectionTitleClass('cabinet')}>Основное</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField
              variant="cabinet"
              label="Название вакансии"
              placeholder="Официант на банкет"
              required
              error={fv.title?.message}
              {...form.register('title')}
            />
          </div>
          <FormSelect
            variant="cabinet"
            label="Категория"
            options={CATEGORY_OPTIONS}
            placeholder="Выберите категорию"
            required
            error={fv.category?.message}
            {...form.register('category')}
          />
          <FormSelect
            variant="cabinet"
            label="Тип мероприятия (опционально)"
            options={EVENT_TYPE_OPTIONS}
            placeholder="—"
            error={(fv as Record<string, { message?: string } | undefined>).eventType?.message}
            {...form.register('eventType')}
          />
          <div className="sm:col-span-2">
            <FormTextarea
              variant="cabinet"
              label="Описание"
              placeholder="Опишите вакансию для кандидатов"
              rows={5}
              required
              error={fv.description?.message}
              {...form.register('description')}
            />
          </div>
        </div>
      </section>

      <section className={employerFormSectionShellClass('cabinet')}>
        <h2 className={employerFormSectionTitleClass('cabinet')}>Дата и время</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Controller
            name="dateStart"
            control={form.control}
            render={({ field }) => (
              <FormDateTimePicker
                variant="cabinet"
                label="Дата и время начала"
                required
                placeholder="Откройте календарь"
                error={fv.dateStart?.message}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                minDateTime={minStartLead}
              />
            )}
          />

          <Controller
            name="dateEnd"
            control={form.control}
            render={({ field }) => (
              <FormDateTimePicker
                variant="cabinet"
                label="Дата окончания"
                helper="Необязательно"
                placeholder="Нет конечной даты"
                clearable
                error={fv.dateEnd?.message}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                minDateTime={parseStart}
              />
            )}
          />

          <div className="sm:col-span-2">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-wide text-white/45">
              Тип занятости
            </p>
            <div className="space-y-4">
              {PRIMARY_EMPLOYMENT_KEYS.map((key) => (
                <FormRadio
                  key={key}
                  variant="cabinet"
                  label={EMPLOYMENT_TYPES[key]}
                  value={key}
                  {...form.register('employmentType')}
                />
              ))}
            </div>
            {showExtraEmployment && (
              <div className="mt-5">
                <FormSelect
                  variant="cabinet"
                  label="Занятость (точнее)"
                  options={Object.entries(EMPLOYMENT_TYPES).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  error={fv.employmentType?.message}
                  {...form.register('employmentType')}
                />
              </div>
            )}
            {!showExtraEmployment && fv.employmentType?.message && (
              <p className="mt-3 text-[13px] text-red-400">{fv.employmentType.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className={employerFormSectionShellClass('cabinet')}>
        <h2 className={employerFormSectionTitleClass('cabinet')}>Условия</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField
            variant="cabinet"
            label="Ставка"
            helper="Значение в рублях за выбранный тип оплаты"
            type="number"
            min={0}
            step="0.01"
            required
            error={fv.rate?.message}
            {...form.register('rate', { valueAsNumber: true })}
          />
          <FormSelect
            variant="cabinet"
            label="Тип оплаты"
            options={RATE_TYPE_OPTIONS}
            required
            error={fv.rateType?.message}
            {...form.register('rateType')}
          />

          <FormSelect
            variant="cabinet"
            label="Город"
            options={cityOptions}
            placeholder={cityOptions.length ? 'Выберите город' : 'Загрузка…'}
            required
            error={(fv as Record<string, { message?: string } | undefined>).cityId?.message}
            {...form.register('cityId')}
          />

          <FormField
            variant="cabinet"
            label="Мест нужно"
            type="number"
            min={1}
            error={fv.workersNeeded?.message}
            {...form.register('workersNeeded', { valueAsNumber: true })}
          />

          <div className="sm:col-span-2">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-wide text-white/45">
              Срочность
            </p>
            <Controller
              name="isUrgent"
              control={form.control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={field.value === false}
                    onClick={() => field.onChange(false)}
                    onBlur={field.onBlur}
                    className={`rounded-[10px] border px-4 py-3 text-left text-sm font-semibold transition ${
                      field.value === false
                        ? 'border-[#2d6a4a] bg-[#2d6a4a]/20 text-emerald-100'
                        : 'border-white/[0.12] bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                    }`}
                  >
                    Обычная
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={field.value === true}
                    onClick={() => field.onChange(true)}
                    onBlur={field.onBlur}
                    className={`rounded-[10px] border px-4 py-3 text-left text-sm font-semibold transition ${
                      field.value === true
                        ? 'border-[#2d6a4a] bg-[#2d6a4a]/20 text-emerald-100'
                        : 'border-white/[0.12] bg-white/[0.03] text-white/72 hover:bg-white/[0.06]'
                    }`}
                  >
                    Срочно
                  </button>
                </div>
              )}
            />
          </div>

          <div className="sm:col-span-2">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-wide text-white/45">
              Теги
            </p>
            <Controller
              name="tags"
              control={form.control}
              render={({ field }) => {
                const sel = Array.isArray(field.value) ? field.value : [];
                return (
                  <div className="flex flex-wrap gap-2">
                    {VACANCY_QUICK_TAGS.map((tag) => {
                      const on = sel.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            field.onChange(
                              on ? sel.filter((x) => x !== tag) : [...sel, tag],
                            );
                          }}
                          className={
                            'rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition ' +
                            (on
                              ? 'border-[#2d6a4a] bg-[#2d6a4a]/20 text-emerald-100'
                              : 'border-white/[0.12] bg-white/[0.03] text-white/68 hover:bg-white/[0.06]')
                          }
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            />
            {fv.tags?.message && (
              <p role="alert" className="mt-2 text-xs text-red-400">
                {fv.tags.message as string}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={employerFormSectionShellClass('cabinet')}>
        <h2 className={employerFormSectionTitleClass('cabinet')}>Требования и обязанности</h2>
        <div className="space-y-5">
          <FormTextarea
            variant="cabinet"
            label="Обязанности"
            placeholder="Что нужно делать на смене"
            rows={4}
            error={fv.responsibilities?.message}
            {...form.register('responsibilities')}
          />
          <FormTextarea
            variant="cabinet"
            label="Требования"
            placeholder="Опыт, навыки, внешний вид"
            rows={4}
            error={fv.requirements?.message}
            {...form.register('requirements')}
          />
          <FormTextarea
            variant="cabinet"
            label="Условия (опционально)"
            helper="Если хотите добавить особые условия"
            rows={3}
            error={fv.conditions?.message}
            {...form.register('conditions')}
          />
        </div>
      </section>

      <section className={employerFormSectionShellClass('cabinet')}>
        <h2 className={employerFormSectionTitleClass('cabinet')}>Изображение</h2>
        <FormField
          variant="cabinet"
          label="Обложка (URL)"
          placeholder="https://…"
          type="url"
          error={(fv as Record<string, { message?: string }>).coverImageUrl?.message}
          {...form.register('coverImageUrl')}
        />
      </section>

      <section className={employerFormSectionShellClass('cabinet')}>
        <h2 className={employerFormSectionTitleClass('cabinet')}>Дополнительно</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormCheckbox variant="cabinet" label="Питание предоставляется" {...form.register('foodProvided')} />
          <FormCheckbox
            variant="cabinet"
            label="Трансфер предоставляется"
            {...form.register('transportProvided')}
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pb-12 pt-8 sm:flex-row sm:justify-end">
        <Link
          href="/employer/vacancies"
          className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] border border-transparent px-5 text-sm font-semibold text-white/55 transition hover:bg-white/[0.06] hover:text-white"
        >
          Отмена
        </Link>
        {mode === 'create' ? (
          <>
            <button
              type="button"
              onClick={() => submitDraft()}
              disabled={form.formState.isSubmitting}
              className="inline-flex min-h-[46px] min-w-[220px] items-center justify-center rounded-[10px] border border-white/[0.14] px-6 py-3 text-sm font-semibold text-white/88 transition hover:border-white/[0.22] hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:text-white/30"
            >
              {form.formState.isSubmitting ? 'Отправляем…' : 'Сохранить как черновик'}
            </button>
            <button
              type="button"
              onClick={() => submitPublish()}
              disabled={form.formState.isSubmitting}
              className="inline-flex min-h-[46px] min-w-[260px] items-center justify-center rounded-[10px] bg-unity-gradient-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_32px_rgba(45,106,74,0.35)] transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/38 disabled:shadow-none"
            >
              {form.formState.isSubmitting ? 'Публикуем…' : 'Опубликовать'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => submitEdit()}
            disabled={form.formState.isSubmitting}
            className="inline-flex min-h-[46px] min-w-[220px] items-center justify-center rounded-[10px] bg-unity-gradient-primary px-8 py-3 text-sm font-semibold text-white shadow-[0_10px_32px_rgba(45,106,74,0.35)] transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/38 disabled:shadow-none"
          >
            {form.formState.isSubmitting ? 'Сохраняем…' : effectiveSubmitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
