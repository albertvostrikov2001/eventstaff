'use client';

import { useRef, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ModerationBadge } from '@/components/media/ModerationBadge';
import type { MediaItemDto } from '@/components/media/MediaUpload';

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUpload(props: {
  item: MediaItemDto | null;
  profileName: string;
  currentPhotoUrl: string | null;
  onChange: () => void;
}) {
  const { item, profileName, currentPhotoUrl, onChange } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials =
    profileName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || '?';

  const displayUrl =
    item?.url && item.status !== 'rejected'
      ? item.url
      : !item && currentPhotoUrl
        ? currentPhotoUrl
        : null;

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError('Файл больше 5 МБ');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Только JPEG, PNG или WebP');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'AVATAR');
      await apiClient.postMultipart<{ data: MediaItemDto }>('/media/upload', fd);
      onChange();
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!item?.id) return;
    if (!window.confirm('Удалить аватар?')) return;
    try {
      await apiClient.delete(`/media/${item.id}`);
      onChange();
    } catch {
      setError('Не удалось удалить');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div
        className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 text-2xl font-semibold text-gray-500"
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void upload(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Загрузка…' : 'Изменить аватар'}
        </Button>
        {item ? (
          <>
            <ModerationBadge status={item.status} note={item.moderationNote} />
            <Button type="button" variant="ghost" size="sm" onClick={() => void remove()}>
              Удалить загрузку
            </Button>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Пока модератор не одобрит файл, в публичном профиле остаётся предыдущее фото (если было).
          </p>
        )}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
