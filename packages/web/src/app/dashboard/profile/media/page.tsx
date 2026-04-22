'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { AvatarUpload } from '@/components/media/AvatarUpload';
import { MediaUpload, type MediaItemDto } from '@/components/media/MediaUpload';
import { Button } from '@/components/ui/button';

interface MyMedia {
  avatar: MediaItemDto | null;
  portfolio: MediaItemDto[];
  documents: MediaItemDto[];
  videos: MediaItemDto | null;
}

interface WorkerProfile {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export default function WorkerProfileMediaPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [data, setData] = useState<MyMedia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user?.activeRole === 'employer') {
      router.replace('/dashboard/company/media');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      apiClient.get<{ data: MyMedia }>('/media/my'),
      apiClient.get<{ data: WorkerProfile }>('/worker/profile'),
    ]);
    setData(mRes.data);
    setProfile(pRes.data);
  }, []);

  useEffect(() => {
    if (user?.activeRole === 'employer') return;
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [load, user?.activeRole]);

  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';

  if (user?.activeRole === 'employer') {
    return <p className="text-sm text-gray-500">Перенаправление…</p>;
  }

  if (loading || !data || !profile) {
    return <p className="text-sm text-gray-500">Загрузка…</p>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900">Медиа профиля</h1>
        <p className="mt-1 text-sm text-gray-600">
          Файлы проходят модерацию. До одобрения другие пользователи не увидят новые материалы.
        </p>
      </div>

      <section className="rounded-card border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Аватар</h2>
        <div className="mt-4">
          <AvatarUpload
            item={data.avatar}
            profileName={name || 'Профиль'}
            currentPhotoUrl={profile.photoUrl}
            onChange={() => void load()}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Фото с мероприятий</h2>
        <p className="text-sm text-gray-600">До 10 фото (JPEG, PNG, WebP).</p>
        <div className="mt-4 space-y-4">
          {data.portfolio.map((item) => (
            <MediaUpload
              key={item.id}
              uploadType="PORTFOLIO_PHOTO"
              accept="image/jpeg,image/png,image/webp"
              label={`Фото ${item.filename}`}
              item={item}
              onChange={() => void load()}
              hideUploadWhenPresent
            />
          ))}
          {data.portfolio.length < 10 ? (
            <MediaUpload
              uploadType="PORTFOLIO_PHOTO"
              accept="image/jpeg,image/png,image/webp"
              label="Добавить фото"
              item={null}
              onChange={() => void load()}
            />
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Видео-визитка</h2>
        <p className="text-sm text-gray-600">Один файл MP4 или WebM. Новая загрузка заменяет предыдущую.</p>
        <div className="mt-4">
          <MediaUpload
            uploadType="VIDEO_CARD"
            accept="video/mp4,video/webm"
            label="Видео-визитка"
            item={data.videos}
            onChange={() => void load()}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Документы</h2>
        <p className="text-sm text-gray-600">До 5 файлов PDF.</p>
        <div className="mt-4 space-y-4">
          {data.documents.map((item) => (
            <MediaUpload
              key={item.id}
              uploadType="DOCUMENT"
              accept="application/pdf"
              label={item.filename}
              item={item}
              onChange={() => void load()}
              hideUploadWhenPresent
            />
          ))}
          {data.documents.length < 5 ? (
            <MediaUpload
              uploadType="DOCUMENT"
              accept="application/pdf"
              label="Добавить документ"
              item={null}
              onChange={() => void load()}
            />
          ) : null}
        </div>
      </section>

      <Button type="button" variant="outline" onClick={() => void load()}>
        Обновить список
      </Button>
    </div>
  );
}
