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

  const onPortfolioUploaded = (item: MediaItemDto) => {
    setPack((prev) =>
      prev ? { ...prev, portfolio: [item, ...prev.portfolio.filter((p) => p.id !== item.id)] } : prev,
    );
  };

  if (!profile || !pack) {
    return <p className="text-sm text-white/50">Загрузка…</p>;
  }

  const profileName = `${profile.firstName} ${profile.lastName}`.trim() || 'Профиль';

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Медиа профиля</h1>
        <p className="mt-1 text-sm text-white/50">Фото, портфолио и документы</p>
      </div>

      <div className="rounded-input border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-sm font-semibold text-white/90">Аватар</h2>
        <div className="mt-4">
          <AvatarUpload
            profileName={profileName}
            currentPhotoUrl={photoUrl}
            item={pack.avatar}
            onChange={() => void reload()}
          />
        </div>
      </div>

      <div className="rounded-input border border-white/10 bg-white/[0.04] p-5">
        <MediaUpload
          uploadType="PORTFOLIO_PHOTO"
          accept="image/jpeg,image/png,image/webp"
          label="Портфолио"
          description="До 10 фото, до 5 МБ каждое."
          item={null}
          onChange={() => void reload()}
          onUploaded={onPortfolioUploaded}
          hideUploadWhenPresent={false}
        />
      </div>

      {pack.portfolio.map((item) => (
        <div key={item.id} className="rounded-input border border-white/10 bg-white/[0.04] p-5">
          <MediaUpload
            uploadType="PORTFOLIO_PHOTO"
            accept="image/jpeg,image/png,image/webp"
            label="Фото портфолио"
            item={item}
            onChange={() => void reload()}
            hideUploadWhenPresent
          />
        </div>
      ))}
    </div>
  );
}
