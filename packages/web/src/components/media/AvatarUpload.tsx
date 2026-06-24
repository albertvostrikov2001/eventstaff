'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { ModerationBadge } from '@/components/media/ModerationBadge';
import { ImageCropModal } from '@/components/media/ImageCropModal';
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
  const [cropFile, setCropFile] = useState<File | null>(null);

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
    if (file.size > MAX_BYTES) { setError('Файл больше 5 МБ'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Только JPEG, PNG или WebP'); return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'AVATAR');
      await apiClient.postMultipart<{ data: MediaItemDto }>('/media/upload', fd);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ошибка загрузки');
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
    <>
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={1}
          onConfirm={(croppedFile) => {
            setCropFile(null);
            void upload(croppedFile);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Avatar circle with camera overlay */}
        <div className="relative shrink-0">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-white/[0.06] text-2xl font-semibold text-white/50">
            {displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            title="Изменить аватар"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
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
              if (f) setCropFile(f);
            }}
          />
          <p className="text-sm text-white/70">
            {uploading ? 'Загрузка…' : 'Нажмите на значок камеры для смены фото'}
          </p>
          <p className="text-xs text-white/35">JPEG, PNG или WebP · до 5 МБ · кадрирование перед загрузкой</p>
          {item && (
            <>
              <ModerationBadge status={item.status} note={item.moderationNote} />
              <button
                type="button"
                onClick={() => void remove()}
                className="inline-flex w-fit items-center gap-1 text-xs text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить фото
              </button>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </>
  );
}
