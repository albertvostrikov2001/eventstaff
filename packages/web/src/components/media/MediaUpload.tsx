'use client';

import { useRef, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ModerationBadge } from '@/components/media/ModerationBadge';

const MAX_BYTES = 5 * 1024 * 1024;

export interface MediaItemDto {
  id: string;
  type: string;
  url: string | null;
  filename: string;
  mimeType: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected';
  moderationNote: string | null;
  createdAt: string;
}

export function MediaUpload(props: {
  uploadType: string;
  accept: string;
  label: string;
  description?: string;
  item: MediaItemDto | null;
  onChange: () => void;
  /** multiple items: hide upload when item set (e.g. gallery adds new block separately) */
  hideUploadWhenPresent?: boolean;
}) {
  const { uploadType, accept, label, description, item, onChange, hideUploadWhenPresent } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const validateClient = (file: File): string | null => {
    if (file.size > MAX_BYTES) return 'Файл больше 5 МБ';
    const ok = accept.split(',').some((a) => {
      const t = a.trim();
      if (t.endsWith('/*')) {
        const prefix = t.slice(0, -2);
        return file.type.startsWith(prefix);
      }
      return file.type === t;
    });
    if (!ok) return 'Недопустимый тип файла';
    return null;
  };

  const uploadFile = async (file: File) => {
    setError(null);
    const v = validateClient(file);
    if (v) {
      setError(v);
      return;
    }
    let objectUrl: string | null = null;
    if (file.type.startsWith('image/')) {
      objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }

    setUploading(true);
    setProgress(10);
    const iv = window.setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 200);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', uploadType);
      await apiClient.postMultipart<{ data: MediaItemDto }>('/media/upload', fd);
      setProgress(100);
      onChange();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Ошибка загрузки');
      }
    } finally {
      window.clearInterval(iv);
      setUploading(false);
      setProgress(0);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreview(null);
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) void uploadFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadFile(f);
  };

  const remove = async () => {
    if (!item?.id) return;
    if (!window.confirm('Удалить файл?')) return;
    try {
      await apiClient.delete(`/media/${item.id}`);
      onChange();
    } catch {
      setError('Не удалось удалить');
    }
  };

  const showUploader = !hideUploadWhenPresent || !item;

  return (
    <div className="rounded-card border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          {description ? <p className="text-xs text-gray-500">{description}</p> : null}
        </div>
        {item ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void remove()}>
            Удалить
          </Button>
        ) : null}
      </div>

      {item ? (
        <div className="mt-3">
          {item.url && (item.mimeType.startsWith('image/') || item.mimeType.startsWith('video/')) ? (
            <div className="overflow-hidden rounded-lg bg-gray-100">
              {item.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt="" className="max-h-56 w-full object-contain" />
              ) : (
                <video src={item.url} className="max-h-56 w-full" controls muted />
              )}
            </div>
          ) : item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-700 underline"
            >
              Открыть PDF
            </a>
          ) : (
            <p className="text-sm text-gray-500">Файл удалён с диска после модерации</p>
          )}
          <ModerationBadge status={item.status} note={item.moderationNote} />
        </div>
      ) : null}

      {showUploader ? (
        <div
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors ${
            drag ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDrag(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onInput}
          />
          <p className="text-center text-sm text-gray-600">
            Перетащите файл сюда или нажмите для выбора
          </p>
          <p className="mt-1 text-center text-xs text-gray-400">До 5 МБ</p>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="mt-3 max-h-32 rounded object-contain" />
          ) : null}
          {uploading ? (
            <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
