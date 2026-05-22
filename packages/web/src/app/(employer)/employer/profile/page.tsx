'use client';

import type { EmployerProfileUpdateInput } from '@unity/shared';
import { EMPLOYER_COMPANY_ACTIVITY_OPTIONS } from '@unity/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ApiError, apiClient } from '@/lib/api/client';
import { CompanyProfileSchema } from '@/lib/validations/employer';
import {
  employerFormHeadingClass,
  employerFormSectionShellClass,
  employerFormSectionTitleClass,
  employerFormSubheadingClass,
} from '@/components/forms/form-styles';
import { FormField } from '@/components/forms/FormField';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { useToast } from '@/components/ui/toast-context';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface City {
  id: string;
  name: string;
  slug: string;
}

interface EmployerProfile {
  id: string;
  type: string;
  companyName: string | null;
  contactName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactJobTitle: string | null;
  description: string | null;
  businessType: string;
  website: string | null;
  inn: string | null;
  cityId: string | null;
  isVerified: boolean;
  city?: { id: string; name: string } | null;
  user?: { email: string | null; phone: string | null; emailVerified?: boolean };
}

const ACTIVITY_OPTS = EMPLOYER_COMPANY_ACTIVITY_OPTIONS.map(({ value, label }) => ({
  value,
  label,
}));

const ALLOWED_BUSINESS_TYPES = ACTIVITY_OPTS.map(o => o.value);

function normalizeBusinessType(raw: string): EmployerProfileUpdateInput['businessType'] {
  return (ALLOWED_BUSINESS_TYPES as readonly string[]).includes(raw)
    ? (raw as EmployerProfileUpdateInput['businessType'])
    : 'other';
}

function splitContact(p: EmployerProfile): { fn: string; ln: string } {
  const f = p.contactFirstName?.trim();
  const l = p.contactLastName?.trim();
  if (f && l) return { fn: f, ln: l };
  const full = (p.contactName ?? '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  return { fn: parts[0] ?? '', ln: parts.slice(1).join(' ') };
}

function coercePhoneForForm(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  const collapsed = trimmed.replace(/\s+/g, '');
  if (/^\+7\d{10}$/.test(collapsed)) return collapsed;
  const d = collapsed.replace(/\D/g, '');
  if (!d) return trimmed;
  if (d.length === 11 && d.startsWith('8')) return `+7${d.slice(1)}`;
  if (d.length === 11 && d.startsWith('7')) return `+7${d.slice(1)}`;
  if (d.length === 10) return `+7${d}`;
  return `+${d}`;
}

export default function EmployerProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileMeta, setProfileMeta] = useState<EmployerProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [emailVerifiedState, setEmailVerifiedState] = useState(false);

  const form = useForm<EmployerProfileUpdateInput>({
    resolver: zodResolver(CompanyProfileSchema),
    defaultValues: {
      type: 'company',
      companyName: '',
      inn: '',
      contactFirstName: '',
      contactLastName: '',
      contactJobTitle: '',
      phone: '',
      email: '',
      website: '',
      businessType: 'other',
      cityId: '',
      description: '',
    },
  });

  const {
    reset,
    register,
    watch,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
    setError,
  } = form;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      apiClient.get<{ data: EmployerProfile }>('/employer/profile'),
      apiClient.get<{ data: City[] }>('/catalog/cities'),
    ])
      .then(([profileRes, citiesRes]) => {
        if (cancelled) return;
        const p = profileRes.data;
        const list = citiesRes.data;

        setProfileMeta(p);
        setCities(list);
        setEmailVerifiedState(!!p.user?.emailVerified);

        const novoid = list.find(c => c.slug === 'novorossiysk')?.id ?? '';
        const { fn, ln } = splitContact(p);
        reset({
          type: (p.type as EmployerProfileUpdateInput['type']) ?? 'company',
          companyName: p.companyName ?? '',
          inn: (p.inn ?? '').replace(/\D/g, ''),
          contactFirstName: fn,
          contactLastName: ln,
          contactJobTitle: p.contactJobTitle ?? '',
          phone: coercePhoneForForm(p.user?.phone ?? ''),
          email: String(p.user?.email ?? '').trim(),
          website: (p.website ?? '').trim(),
          businessType: normalizeBusinessType(p.businessType),
          cityId: p.cityId ?? novoid,
          description: p.description ?? '',
        });
      })
      .catch(() => {
        toast('Ошибка загрузки профиля', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reset, toast]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const guard = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('a[href]');
      if (!(el instanceof HTMLAnchorElement)) return;
      const hrefAttr = el.getAttribute('href');
      if (!hrefAttr || hrefAttr.startsWith('#')) return;

      let path = hrefAttr;
      let search = '';
      try {
        const u = new URL(hrefAttr, window.location.origin);
        path = u.pathname;
        search = u.search;
      } catch {
        /* relative unchanged */
      }
      if (
        path === window.location.pathname &&
        (search === window.location.search ||
          `${path}${search}` === `${window.location.pathname}${window.location.search}`)
      ) {
        return;
      }

      const ok = window.confirm(
        'Есть несохранённые изменения профиля. Покинуть страницу без сохранения?',
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('click', guard, true);
    return () => document.removeEventListener('click', guard, true);
  }, [isDirty]);
  const cityOptions = cities.map(c => ({ value: c.id, label: c.name }));

  const TYPE_OPTIONS = [
    { value: 'company', label: 'Юридическое лицо' },
    { value: 'individual', label: 'Индивидуальный предприниматель / частное лицо' },
  ];

  const onSubmit = handleSubmit(async (data: EmployerProfileUpdateInput) => {
    try {
      const payload: EmployerProfileUpdateInput = {
        ...data,
        inn: data.inn ? String(data.inn).replace(/\D/g, '') : '',
        website: (data.website ?? '').trim(),
      };

      const res = await apiClient.put<{ data: EmployerProfile }>('/employer/profile', payload);
      const updated = res.data;
      setProfileMeta(updated);
      setEmailVerifiedState(!!updated.user?.emailVerified);
      toast('Профиль обновлён', 'success');

      const { fn, ln } = splitContact(updated);
      reset({
        type: (updated.type as EmployerProfileUpdateInput['type']) ?? 'company',
        companyName: updated.companyName ?? '',
        inn: (updated.inn ?? '').replace(/\D/g, ''),
        contactFirstName: fn,
        contactLastName: ln,
        contactJobTitle: updated.contactJobTitle ?? '',
        phone: coercePhoneForForm(updated.user?.phone ?? ''),
        email: String(updated.user?.email ?? '').trim(),
        website: (updated.website ?? '').trim(),
        businessType: normalizeBusinessType(updated.businessType),
        cityId: updated.cityId ?? '',
        description: updated.description ?? '',
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Не удалось сохранить изменения.';
      toast(msg, 'error');
      const low = msg.toLowerCase();
      if (low.includes('email') || low.includes('почт')) setError('email', { message: msg });
    }
  });

  const descLen = (watch('description') ?? '').length;

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-[14px] border border-white/[0.06] bg-white/[0.06]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={employerFormHeadingClass('cabinet')}>Профиль компании</h1>
          <p className={employerFormSubheadingClass('cabinet')}>
            Данные видны кандидатам в карточке работодателя
          </p>
        </div>
        {profileMeta && (
          <div
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-medium ${
              profileMeta.isVerified
                ? 'border-[color:var(--u-emerald-light,#3d8a62)]/35 bg-[rgba(45,106,74,0.15)] text-emerald-100'
                : 'border-white/10 bg-white/[0.04] text-white/60'
            }`}
          >
            {profileMeta.isVerified ? (
              <ShieldCheck className="h-4 w-4 text-[color:var(--u-emerald-light,#6ee7b7)]" />
            ) : (
              <Shield className="h-4 w-4 opacity-70" />
            )}
            {profileMeta.isVerified ? 'Верифицирован' : 'Не верифицирован'}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-8">
        <section className={employerFormSectionShellClass('cabinet')}>
          <h2 className={employerFormSectionTitleClass('cabinet')}>Информация о компании</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField
                variant="cabinet"
                label="Название компании"
                placeholder='Например, ООО «Гастрономъ»'
                error={errors.companyName?.message}
                {...register('companyName')}
              />
            </div>
            <FormField
              variant="cabinet"
              label="ИНН"
              inputMode="numeric"
              placeholder="Необязательно: 10 или 12 цифр"
              helper="Необязательное поле. Только цифры без пробелов."
              error={errors.inn?.message}
              {...register('inn')}
            />
            <FormSelect
              variant="cabinet"
              label="Сфера деятельности"
              options={ACTIVITY_OPTS}
              placeholder="Выберите сферу"
              error={errors.businessType?.message}
              {...register('businessType')}
            />
            <FormField
              variant="cabinet"
              label="Сайт компании"
              type="url"
              placeholder="https://company.ru"
              helper="Необязательно"
              error={errors.website?.message}
              {...register('website')}
            />
          </div>
        </section>

        <section className={employerFormSectionShellClass('cabinet')}>
          <h2 className={employerFormSectionTitleClass('cabinet')}>Контактная информация</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              variant="cabinet"
              label="Имя"
              placeholder="Иван"
              error={errors.contactFirstName?.message}
              {...register('contactFirstName')}
            />
            <FormField
              variant="cabinet"
              label="Фамилия"
              placeholder="Иванов"
              error={errors.contactLastName?.message}
              {...register('contactLastName')}
            />
            <div className="sm:col-span-2">
              <FormField
                variant="cabinet"
                label="Должность"
                placeholder="Директор по персоналу"
                helper="Необязательное поле"
                error={errors.contactJobTitle?.message}
                {...register('contactJobTitle')}
              />
            </div>
            <FormField
              variant="cabinet"
              label="Телефон"
              placeholder="+79161234567"
              helper="Формат: +7 и ровно 10 цифр после него."
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <FormField
              variant="cabinet"
              label="Email"
              type="email"
              placeholder="company@example.com"
              autoComplete="email"
              readOnly={emailVerifiedState}
              helper={
                emailVerifiedState
                  ? 'Адрес подтверждён и не может быть изменён.'
                  : 'Используется для входа и рассылок.'
              }
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
        </section>

        <section className={employerFormSectionShellClass('cabinet')}>
          <h2 className={employerFormSectionTitleClass('cabinet')}>Дополнительно</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 md:col-span-1">
              <FormSelect
                variant="cabinet"
                label="Город"
                options={cityOptions}
                placeholder={cityOptions.length ? 'Выберите город' : 'Загрузка городов…'}
                error={errors.cityId?.message}
                disabled={cityOptions.length === 0}
                {...register('cityId')}
              />
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <FormSelect
                variant="cabinet"
                label="Формат работодателя"
                options={TYPE_OPTIONS}
                error={errors.type?.message}
                {...register('type')}
              />
            </div>
            <div className="sm:col-span-2">
              <FormTextarea
                variant="cabinet"
                label="О компании"
                showCounter
                counterValue={descLen}
                counterMax={1000}
                maxLength={1000}
                helper="До 1000 символов. Показывается в карточке компании."
                placeholder="Специализация, форматы мероприятий, география работы и т.д."
                rows={5}
                error={errors.description?.message}
                {...register('description')}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={!isDirty || isSubmitting}
            isLoading={isSubmitting}
            className="rounded-[10px] px-6 py-3 shadow-[0_8px_24px_rgba(45,106,74,0.35)] disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
          >
            Сохранить
          </Button>
        </div>
      </form>
    </div>
  );
}
