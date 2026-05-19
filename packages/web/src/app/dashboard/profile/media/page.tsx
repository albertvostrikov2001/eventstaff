'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AvatarUpload } from '@/components/media/AvatarUpload';
import { MediaUpload, type MediaItemDto } from '@/components/media/MediaUpload';

interface WorkerBrief {
  id: string;
  firstName: string;
  lastName: string;
}

interface MediaMyDto {
  avatar: MediaItemDto | null;
  portfolio: MediaItemDto[];
}

export default function WorkerProfileMediaPage() {
  const [profile, setProfile] = useState<WorkerBrief | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pack, setPack] = useState<MediaMyDto | null>(null);

  const reload = useCallback(() => {
    return Promise.all([
      apiClient.get<{
        data: WorkerBrief & { photoUrl: string | null };
      }>('/worker/profile'),
      apiClient.get<{ data: MediaMyDto }>('/media/my'),
    ]).then(([p, m]) => {
      setProfile(p.data);
      setPhotoUrl(p.data.photoUrl);
      setPack(m.data);
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!profile || !pack) {
    return <p className="p-6 text-sm text-gray-500">Загрузка…</p>;
  }

  const profileName = `${profile.firstName} ${profile.lastName}`.trim() || 'Профиль';

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Медиа профиля</h1>
        <p className="mt-1 text-sm text-gray-500">Фото, портфолио и документы для модерации.</p>
      </div>

      <div className="rounded-card border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900">Аватар</h2>
        <div className="mt-4">
          <AvatarUpload
            profileName={profileName}
            currentPhotoUrl={photoUrl}
            item={pack.avatar}
            onChange={() => void reload()}
          />
        </div>
      </div>

      <MediaUpload
        uploadType="PORTFOLIO_PHOTO"
        accept="image/jpeg,image/png,image/webp"
        label="Портфолио"
        description="До 10 фото, до 5 МБ каждое."
        item={null}
        onChange={() => void reload()}
        hideUploadWhenPresent={false}
      />

      {pack.portfolio.map((item) => (
        <MediaUpload
          key={item.id}
          uploadType="PORTFOLIO_PHOTO"
          accept="image/jpeg,image/png,image/webp"
          label="Фото портфолио"
          item={item}
          onChange={() => void reload()}
          hideUploadWhenPresent
        />
      ))}
    </div>
  );
}
