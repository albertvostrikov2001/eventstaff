'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workerProfileUpdateSchema, type WorkerProfileUpdateInput } from '@unity/shared';
import { FormField, FormTextarea, FormSelect, FormCheckbox } from '@/components/forms/FormField';
import { useToast } from '@/components/ui/toast-context';
import { apiClient } from '@/lib/api/client';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { CategoryMultiSelect, type WorkerCategoryItem } from '@/components/worker/CategoryMultiSelect';
import { AvatarUpload } from '@/components/media/AvatarUpload';
import { MediaUpload, type MediaItemDto } from '@/components/media/MediaUpload';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';

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
  photoUrl: string | null;
  categories: WorkerCategoryItem[];
}

interface MediaMyDto {
  avatar: MediaItemDto | null;
  portfolio: MediaItemDto[];
  documents: MediaItemDto[];
}

const RATE_TYPE_OPTIONS = [
  { value: 'per_shift',   label: 'За смену' },
  { value: 'monthly',     label: 'За месяц' },
];

const MONTHS_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '0 мес.' : `${i} мес.`,
}));

export default function WorkerProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile]         = useState<WorkerProfile | null>(null);
  const [cities, setCities]           = useState<City[]>([]);
  const [loading, setLoading]         = useState(true);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [categories, setCategories]   = useState<WorkerCategoryItem[]>([]);
  const [showPublicHint, setShowPublicHint] = useState(false);

  // Media state
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null);
  const [mediaAvatar, setMediaAvatar] = useState<MediaItemDto | null>(null);
  const [portfolio, setPortfolio]     = useState<MediaItemDto[]>([]);
  const [documents, setDocuments]     = useState<MediaItemDto[]>([]);

  // Experience: split into years + months for the UI
  const [expYears,  setExpYears]  = useState(0);
  const [expMonths, setExpMonths] = useState(0);

  const form = useForm<WorkerProfileUpdateInput>({
    resolver: zodResolver(workerProfileUpdateSchema),
  });

  const reloadMedia = useCallback(() => {
    return apiClient
      .get<{ data: MediaMyDto }>('/media/my')
      .then((m) => {
        setMediaAvatar(m.data.avatar);
        setPortfolio(m.data.portfolio ?? []);
        setDocuments(m.data.documents ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ data: WorkerProfile }>('/worker/profile'),
      apiClient.get<{ data: City[] }>('/catalog/cities'),
      apiClient.get<{ data: MediaMyDto }>('/media/my'),
    ])
      .then(([profileRes, citiesRes, mediaRes]) => {
        const p = profileRes.data;
        setProfile(p);
        setPhotoUrl(p.photoUrl);
        setCategories(p.categories ?? []);
        setCities(citiesRes.data);
        setMediaAvatar(mediaRes.data.avatar);
        setPortfolio(mediaRes.data.portfolio ?? []);
        setDocuments(mediaRes.data.documents ?? []);

        // Split experienceYears into years + months
        const totalFrac = p.experienceYears ?? 0;
        const yrs = Math.floor(totalFrac);
        const mos = Math.round((totalFrac - yrs) * 12);
        setExpYears(yrs);
        setExpMonths(mos);

        form.reset({
          firstName:      p.firstName,
          lastName:       p.lastName,
          bio:            p.bio ?? undefined,
          experienceYears: totalFrac,
          hasMedicalBook: p.hasMedicalBook,
          willingToTravel: p.willingToTravel,
          overtimeReady:  p.overtimeReady,
          readyForTrips:  p.readyForTrips,
          readyForOvertime: p.readyForOvertime,
          desiredRate:    p.desiredRate ? Number(p.desiredRate) : undefined,
          rateType:       (p.rateType as WorkerProfileUpdateInput['rateType']) ?? 'per_shift',
          visibility:     (p.visibility as WorkerProfileUpdateInput['visibility']) ?? 'hidden',
          cityId:         p.cityId ?? undefined,
        });
      })
      .catch(() => toast('Не удалось загрузить профиль', 'error'))
      .finally(() => setLoading(false));
  }, [form, toast]);

  // Sync exp fields → form value whenever years or months change
  useEffect(() => {
    const combined = expYears + expMonths / 12;
    form.setValue('experienceYears', combined, { shouldDirty: true });
  }, [expYears, expMonths, form]);

  const onSubmit = async (data: WorkerProfileUpdateInput) => {
    try {
      const payload = { ...data, experienceYears: expYears + expMonths / 12 };
      const res = await apiClient.put<{ data: WorkerProfile }>('/worker/profile', payload);
      const saved = res.data;
      setProfile(saved);

      // Update form with saved data so nothing resets
      const totalFrac = saved.experienceYears ?? 0;
      const yrs = Math.floor(totalFrac);
      const mos = Math.round((totalFrac - yrs) * 12);
      setExpYears(yrs);
      setExpMonths(mos);
      form.reset({
        firstName:       saved.firstName,
        lastName:        saved.lastName,
        bio:             saved.bio ?? undefined,
        experienceYears: totalFrac,
        hasMedicalBook:  saved.hasMedicalBook,
        willingToTravel: saved.willingToTravel,
        overtimeReady:   saved.overtimeReady,
        readyForTrips:   saved.readyForTrips,
        readyForOvertime: saved.readyForOvertime,
        desiredRate:     saved.desiredRate ? Number(saved.desiredRate) : undefined,
        rateType:        (saved.rateType as WorkerProfileUpdateInput['rateType']) ?? 'per_shift',
        visibility:      (saved.visibility as WorkerProfileUpdateInput['visibility']) ?? 'hidden',
        cityId:          saved.cityId ?? undefined,
      });

      toast('Профиль сохранён', 'success');

      // Show hint to make profile public if it's still hidden
      if (saved.visibility !== 'public') {
        setShowPublicHint(true);
      } else {
        setShowPublicHint(false);
      }
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
      setShowPublicHint(false);
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
          <div key={i} className="h-12 animate-pulse rounded-[12px] bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  const cityOptions = cities.map((c) => ({ value: c.id, label: c.name }));
  const isPublic = profile?.visibility === 'public';
  const profileName = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Профиль';

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Мой профиль</h1>
          <p className="mt-1 text-sm text-white/50">Заполните анкету для поиска работы</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPublic && profile && (
            <Link
              href={`/workers/${profile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-[var(--r-3)] border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white/90"
            >
              <ExternalLink className="h-4 w-4" />
              Как видят меня
            </Link>
          )}
          <button
            onClick={toggleVisibility}
            disabled={togglingVisibility}
            className={`flex items-center gap-2 rounded-[var(--r-3)] px-4 py-2 text-sm font-medium transition ${
              isPublic
                ? 'border border-white/20 bg-white/[0.06] text-white/80 hover:bg-white/[0.10]'
                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
            }`}
          >
            {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {isPublic ? 'Анкета видна' : 'Анкета скрыта'}
          </button>
        </div>
      </div>

      {/* Profile completion indicator */}
      <ProfileCompletion
        items={[
          { label: 'Имя и фамилия', done: !!(profile?.firstName && profile?.lastName) },
          { label: 'Город', done: !!profile?.cityId },
          { label: 'Специализация', done: categories.length > 0 },
          { label: 'Ставка', done: !!profile?.desiredRate },
          { label: 'О себе', done: !!(profile?.bio && profile.bio.length > 20) },
          { label: 'Фото профиля', done: !!photoUrl },
          { label: 'Публикация анкеты', done: profile?.visibility === 'public' },
        ]}
      />

      {/* Visibility banners */}
      {!isPublic && !showPublicHint && (
        <div className="flex items-start gap-3 rounded-[var(--r-4)] border border-amber-400/30 bg-amber-400/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200">
            Ваша анкета скрыта. Заполните имя, фамилию, город, категорию и ставку, затем нажмите &quot;Анкета скрыта&quot; для публикации.
          </p>
        </div>
      )}

      {isPublic && (
        <div className="flex items-start gap-3 rounded-[var(--r-4)] border border-emerald-400/30 bg-emerald-400/10 p-4">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-200">
            Ваша анкета опубликована и видна работодателям.
          </p>
        </div>
      )}

      {/* ── Public hint after save ── */}
      {showPublicHint && !isPublic && (
        <div className="flex items-start gap-3 rounded-[var(--r-4)] border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <div className="flex-1 text-sm text-white/80">
            <p className="font-medium text-white">Профиль сохранён! Сделайте анкету публичной</p>
            <p className="mt-1 text-white/60">
              Чтобы работодатели могли вас найти, нажмите кнопку{' '}
              <span className="font-semibold text-[var(--accent)]">«Анкета скрыта»</span>{' '}
              в правом верхнем углу — она станет зелёной и анкета появится в поиске.
            </p>
          </div>
          <button onClick={() => setShowPublicHint(false)} className="text-white/30 hover:text-white/60 text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Avatar section ── */}
      <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="mb-4 text-base font-semibold text-white">Фото профиля</h2>
        <AvatarUpload
          profileName={profileName}
          currentPhotoUrl={photoUrl}
          item={mediaAvatar}
          onChange={() => {
            void reloadMedia();
          }}
        />
      </div>

      {/* ── Main form ── */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Основная информация</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              variant="cabinet"
              label="Имя"
              required
              error={form.formState.errors.firstName?.message}
              {...form.register('firstName')}
            />
            <FormField
              variant="cabinet"
              label="Фамилия"
              required
              error={form.formState.errors.lastName?.message}
              {...form.register('lastName')}
            />
            <FormSelect
              variant="cabinet"
              label="Город"
              options={cityOptions}
              placeholder="Выберите город"
              error={form.formState.errors.cityId?.message}
              {...form.register('cityId')}
            />
            <div className="sm:col-span-2">
              <CategoryMultiSelect
                initial={categories}
                onChange={setCategories}
              />
            </div>
            <FormField
              variant="cabinet"
              label="Желаемая ставка (₽)"
              type="number"
              min={0}
              placeholder="Например: 500"
              error={form.formState.errors.desiredRate?.message}
              {...form.register('desiredRate', { valueAsNumber: true })}
            />
            <FormSelect
              variant="cabinet"
              label="Тип ставки"
              options={RATE_TYPE_OPTIONS}
              error={form.formState.errors.rateType?.message}
              {...form.register('rateType')}
            />

            {/* Experience: years + months */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]">
                Опыт работы
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50}
                    placeholder="0"
                    value={expYears === 0 ? '' : expYears}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setExpYears(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                    className="w-20 rounded-[var(--r-2)] border border-[var(--border-default)] bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-center text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-faint)] [color-scheme:dark]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">лет</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={expMonths}
                    onChange={(e) => setExpMonths(Number(e.target.value))}
                    className="rounded-[var(--r-2)] border border-[var(--border-default)] bg-[rgba(255,255,255,.03)] px-3 py-2.5 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-faint)] [color-scheme:dark]"
                  >
                    {MONTHS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="text-sm text-[var(--text-secondary)]">месяцев</span>
                </div>
              </div>
              {expYears === 0 && expMonths === 0 && (
                <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">Укажите ваш опыт. Для 5 месяцев: 0 лет + 5 мес.</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <FormTextarea
              variant="cabinet"
              label="О себе"
              placeholder="Расскажите о себе, опыте и навыках"
              rows={4}
              error={form.formState.errors.bio?.message}
              {...form.register('bio')}
            />
          </div>

          <div className="mt-4 space-y-3">
            <FormCheckbox variant="cabinet" label="Есть медицинская книжка"         {...form.register('hasMedicalBook')} />
            <FormCheckbox variant="cabinet" label="Готов к командировкам"            {...form.register('willingToTravel')} />
            <FormCheckbox variant="cabinet" label="Готов к сверхурочной работе"      {...form.register('overtimeReady')} />
            <FormCheckbox variant="cabinet" label="Готов к выездам (вне города)"     {...form.register('readyForTrips')} />
            <FormCheckbox variant="cabinet" label="Готов к овертаймам (доп. часы)"   {...form.register('readyForOvertime')} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="rounded-[var(--r-3)] bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>

      {/* ── Portfolio ── */}
      <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="mb-1 text-base font-semibold text-white">Портфолио</h2>
        <p className="mb-4 text-sm text-white/50">
          Покажите свою работу — фото с мероприятий. До 10 фото, до 5 МБ каждое.
        </p>
        <MediaUpload
          uploadType="PORTFOLIO_PHOTO"
          accept="image/jpeg,image/png,image/webp"
          label="Добавить фото"
          description="JPG, PNG, WEBP · до 5 МБ"
          item={null}
          onChange={() => void reloadMedia()}
          onUploaded={(item) =>
            setPortfolio((prev) => [item, ...prev.filter((p) => p.id !== item.id)])
          }
          hideUploadWhenPresent={false}
        />
        {portfolio.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {portfolio.map((item) => (
              <MediaUpload
                key={item.id}
                uploadType="PORTFOLIO_PHOTO"
                accept="image/jpeg,image/png,image/webp"
                label="Фото портфолио"
                item={item}
                onChange={() => void reloadMedia()}
                hideUploadWhenPresent
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Documents / Resume ── */}
      <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-6">
        <h2 className="mb-1 text-base font-semibold text-white">Резюме и документы</h2>
        <p className="mb-4 text-sm text-white/50">Прикрепите резюме (PDF, DOC) или другие документы. До 5 МБ.</p>
        <MediaUpload
          uploadType="DOCUMENT"
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
          label="Добавить документ"
          description="PDF, DOC, DOCX, JPG, PNG · до 5 МБ"
          item={null}
          onChange={() => void reloadMedia()}
          onUploaded={(item) => setDocuments((prev) => [item, ...prev.filter((d) => d.id !== item.id)])}
          hideUploadWhenPresent={false}
        />
        {documents.map((doc) => (
          <div key={doc.id} className="mt-3">
            <MediaUpload
              uploadType="DOCUMENT"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              label={doc.filename || 'Документ'}
              item={doc}
              onChange={() => void reloadMedia()}
              hideUploadWhenPresent
            />
          </div>
        ))}
      </div>
    </div>
  );
}
