'use client';

import { useRef, useState } from 'react';
import { Upload, Trash2, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { ModerationBadge } from '@/components/media/ModerationBadge';
import { ImageCropModal } from '@/components/media/ImageCropModal';

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
  onUploaded?: (item: MediaItemDto) => void;
  hideUploadWhenPresent?: boolean;
  /** Enable image crop modal before upload (default: true for images) */
  cropEnabled?: boolean;
  /** Output crop aspect ratio (e.g. 1 for square). null = free crop */
  cropAspect?: number | null;
}) {
  const {
    uploadType,
    accept,
    label,
    description,
    item,
    onChange,
    onUploaded,
    hideUploadWhenPresent,
    cropEnabled,
    cropAspect = null,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const isImageAccept = accept.includes('image/');
  const shouldCrop = cropEnabled !== false && isImageAccept;

  const validateClient = (file: File): string | null => {
    if (file.size > MAX_BYTES) return 'Файл больше 5 МБ';
    const ok = accept.split(',').some((a) => {
      const t = a.trim();
      if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -2));
      return file.type === t;
    });
    if (!ok) return 'Недопустимый тип файла';
    return null;
  };

  const uploadFile = async (file: File) => {
    setError(null);
    const v = validateClient(file);
    if (v) { setError(v); return; }

    setUploading(true);
    setProgress(10);
    const iv = window.setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 200);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', uploadType);
      const res = await apiClient.postMultipart<{ data: MediaItemDto }>('/media/upload', fd);
      setProgress(100);
      onUploaded?.(res.data);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Ошибка загрузки');
    } finally {
      window.clearInterval(iv);
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileSelected = (file: File) => {
    if (shouldCrop && file.type.startsWith('image/')) {
      setCropFile(file);
    } else {
      void uploadFile(file);
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) handleFileSelected(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
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
    <>
      {/* Crop modal */}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={cropAspect}
          onConfirm={(croppedFile) => {
            setCropFile(null);
            void uploadFile(croppedFile);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}

      <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white/90">{label}</h3>
            {description ? <p className="mt-0.5 text-xs text-white/45">{description}</p> : null}
          </div>
          {item && (
            <button
              type="button"
              onClick={() => void remove()}
              title="Удалить"
              className="flex shrink-0 items-center gap-1 rounded-input border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </button>
          )}
        </div>

        {/* Preview */}
        {item && (
          <div className="mt-3">
            {item.url && item.mimeType.startsWith('image/') ? (
              <div className="overflow-hidden rounded-[10px] bg-white/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt=""
                  className="max-h-60 w-full object-contain"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            ) : item.url && item.mimeType.startsWith('video/') ? (
              <div className="overflow-hidden rounded-[10px] bg-black">
                <video src={item.url} className="max-h-60 w-full" controls muted />
              </div>
            ) : item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-input border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-emerald-400 hover:bg-white/[0.10]"
              >
                <FileText className="h-4 w-4" />
                Открыть файл
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            ) : (
              <p className="text-sm text-white/40">Файл обрабатывается</p>
            )}
            <div className="mt-2">
              <ModerationBadge status={item.status} note={item.moderationNote} />
            </div>
          </div>
        )}

        {/* Uploader zone */}
        {showUploader && (
          <div
            className={[
              'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border-2 border-dashed px-4 py-7 transition-colors',
              drag
                ? 'border-emerald-500 bg-emerald-500/[0.08]'
                : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]',
              uploading ? 'pointer-events-none opacity-70' : '',
            ].join(' ')}
            onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          >
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={onInput}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-white/50">Загрузка…</p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]">
                  {isImageAccept ? (
                    <ImageIcon className="h-5 w-5 text-white/40" />
                  ) : (
                    <Upload className="h-5 w-5 text-white/40" />
                  )}
                </div>
                <p className="text-center text-sm text-white/65">
                  Перетащите сюда или{' '}
                  <span className="text-emerald-400">выберите файл</span>
                </p>
                <p className="mt-1 text-center text-xs text-white/30">
                  {shouldCrop ? 'Изображение можно будет обрезать после выбора · ' : ''}До 5 МБ
                </p>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="mt-2 rounded-input border border-red-500/30 bg-red-500/[0.08] px-3 py-1.5 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
