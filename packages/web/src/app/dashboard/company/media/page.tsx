'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { MediaUpload, type MediaItemDto } from '@/components/media/MediaUpload';
import { Button } from '@/components/ui/button';

interface CompanyMyMedia {
  logo: MediaItemDto | null;
  banner: MediaItemDto | null;
  gallery: MediaItemDto[];
}

interface EmployerProfile {
  companyName: string | null;
  contactName: string | null;
  logoUrl: string | null;
  bannerUrl?: string | null;
}

export default function EmployerCompanyMediaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [data, setData] = useState<CompanyMyMedia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.activeRole === 'worker') {
      router.replace('/dashboard/profile/media');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      apiClient.get<{ data: CompanyMyMedia }>('/media/my'),
      apiClient.get<{ data: EmployerProfile }>('/employer/profile'),
    ]);
    setData(mRes.data);
    setProfile(pRes.data);
  }, []);

  useEffect(() => {
    if (user?.activeRole === 'worker') return;
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load, user?.activeRole]);

  if (user?.activeRole === 'worker') {
    return <p className="text-sm text-gray-500">Перенаправление…</p>;
  }

  if (loading || !data || !profile) {
    return <p className="text-sm text-gray-500">Загрузка…</p>;
  }

  const logoFallback = profile.logoUrl;
  const bannerFallback = profile.bannerUrl ?? null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Медиа компании</h1>
        <p className="mt-1 text-sm text-gray-600">
          Логотип, баннер и галерея проходят модерацию перед публикацией.
        </p>
      </div>

      <section className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Логотип</h2>
        {!data.logo && logoFallback ? (
          <div className="mt-3 flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoFallback} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        ) : null}
        <div className="mt-4">
          <MediaUpload
            uploadType="COMPANY_LOGO"
            accept="image/jpeg,image/png,image/webp"
            label="Загрузить логотип"
            description="JPEG, PNG или WebP. Новый файл заменит предыдущий."
            item={data.logo}
            onChange={() => void load()}
          />
        </div>
      </section>

      <section className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Баннер</h2>
        {!data.banner && bannerFallback ? (
          <div className="mt-3 max-h-40 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerFallback} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="mt-4">
          <MediaUpload
            uploadType="COMPANY_BANNER"
            accept="image/jpeg,image/png,image/webp"
            label="Загрузить баннер"
            item={data.banner}
            onChange={() => void load()}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Галерея мероприятий</h2>
        <p className="text-sm text-gray-600">До 10 фото.</p>
        <div className="mt-4 space-y-4">
          {data.gallery.map((item) => (
            <MediaUpload
              key={item.id}
              uploadType="COMPANY_GALLERY"
              accept="image/jpeg,image/png,image/webp"
              label={`Фото ${item.filename}`}
              item={item}
              onChange={() => void load()}
              hideUploadWhenPresent
            />
          ))}
          {data.gallery.length < 10 ? (
            <MediaUpload
              uploadType="COMPANY_GALLERY"
              accept="image/jpeg,image/png,image/webp"
              label="Добавить в галерею"
              item={null}
              onChange={() => void load()}
            />
          ) : null}
        </div>
      </section>

      <Button type="button" variant="outline" onClick={() => void load()}>
        Обновить
      </Button>
    </div>
  );
}
