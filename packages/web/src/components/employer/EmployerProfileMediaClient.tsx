'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Trash2, ImagePlus } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import type { MediaItemDto } from '@/components/media/MediaUpload';
import { EmployerLogoMark } from '@/components/employer/EmployerLogoMark';
import { ImageCropModal } from '@/components/media/ImageCropModal';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp';
const GALLERY_MAX = 10;

interface MediaMyDto {
  logo: MediaItemDto | null;
  banner: MediaItemDto | null;
  gallery: MediaItemDto[];
}

interface EmployerBasics {
  companyName: string | null;
  contactName: string | null;
}

function warnSmallImage(file: File, toast: (m: string, t?: 'success' | 'error' | 'info') => void) {
  if (!file.type.startsWith('image/')) return;
  const u = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(u);
    if (img.width < 200 || img.height < 200) {
      toast('Изображение меньше 200×200 — может выглядеть размыто на сайте.', 'info');
    }
  };
  img.onerror = () => URL.revokeObjectURL(u);
  img.src = u;
}

async function uploadWithShimProgress(
  endpoint: string,
  fd: FormData,
  setProgress: (n: number) => void,
): Promise<{ data: MediaItemDto }> {
  setProgress(8);
  let p = 8;
  const iv = window.setInterval(() => {
    p = Math.min(p + 11, 88);
    setProgress(p);
  }, 180);
  try {
    const res = await apiClient.postMultipart<{ data: MediaItemDto }>(endpoint, fd);
    setProgress(100);
    return res;
  } finally {
    window.clearInterval(iv);
    setProgress(0);
  }
}

export function EmployerProfileMediaClient() {
  const { toast } = useToast();
  const [basics, setBasics] = useState<EmployerBasics | null>(null);
  const [pack, setPack] = useState<MediaMyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoProg, setLogoProg] = useState(0);
  const [bannerProg, setBannerProg] = useState(0);
  const [galleryProg, setGalleryProg] = useState(0);
  const [cropState, setCropState] = useState<{
    file: File;
    type: 'COMPANY_LOGO' | 'COMPANY_BANNER' | 'COMPANY_GALLERY';
    aspect: number | null;
    setProg: (n: number) => void;
  } | null>(null);

  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const [prof, my] = await Promise.all([
        apiClient.get<{ data: EmployerBasics }>('/employer/profile'),
        apiClient.get<{ data: MediaMyDto }>('/employer/media/my'),
      ]);
      setBasics(prof.data);
      setPack(my.data);
    } catch {
      toast('Не удалось загрузить медиа', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const validate = (file: File): boolean => {
    if (file.size > MAX_BYTES) {
      toast('Файл слишком большой (макс 5 МБ)', 'error');
      return false;
    }
    if (!ALLOWED.has(file.type)) {
      toast('Неподдерживаемый формат', 'error');
      return false;
    }
    return true;
  };

  const uploadKind = async (
    file: File,
    type: 'COMPANY_LOGO' | 'COMPANY_BANNER' | 'COMPANY_GALLERY',
    setProg: (n: number) => void,
  ) => {
    if (!validate(file)) return;
    warnSmallImage(file, toast);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    try {
      await uploadWithShimProgress('/employer/media/upload', fd, setProg);
      await reload();
      toast('Файл загружен', 'success');
    } catch (e) {
      if (e instanceof ApiError) toast(e.message, 'error');
      else toast('Ошибка загрузки', 'error');
    }
  };

  const handleFilePickForCrop = (
    file: File,
    type: 'COMPANY_LOGO' | 'COMPANY_BANNER' | 'COMPANY_GALLERY',
    aspect: number | null,
    setProg: (n: number) => void,
  ) => {
    if (!validate(file)) return;
    if (file.type.startsWith('image/')) {
      setCropState({ file, type, aspect, setProg });
    } else {
      void uploadKind(file, type, setProg);
    }
  };

  const deleteMedia = async (item: MediaItemDto | null, kind: 'logo' | 'banner' | 'gallery') => {
    if (!item?.id) return;
    if (kind === 'logo') {
      if (!window.confirm('Удалить логотип компании?')) return;
    } else if (kind === 'banner') {
      if (!window.confirm('Удалить баннер компании?')) return;
    }
    try {
      await apiClient.delete(`/employer/media/${item.id}`);
      await reload();
      toast('Удалено', 'success');
    } catch {
      toast('Не удалось удалить', 'error');
    }
  };

  if (loading && !pack) {
    return <p className="text-sm text-gray-500">Загрузка…</p>;
  }

  const gallerySorted =
    pack?.gallery
      ?.slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) ?? [];
  const galleryCount = gallerySorted.length;

  const companyName = basics?.companyName ?? null;
  const contactName = basics?.contactName ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-10 py-6">
      {cropState && (
        <ImageCropModal
          file={cropState.file}
          aspect={cropState.aspect}
          onConfirm={(croppedFile) => {
            const { type, setProg } = cropState;
            setCropState(null);
            void uploadKind(croppedFile, type, setProg);
          }}
          onCancel={() => setCropState(null)}
        />
      )}
      <Breadcrumbs
        items={[
          { label: 'Профиль', href: '/employer/profile' },
          { label: 'Медиафайлы' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-white">Медиа компании</h1>
        <p className="mt-1 text-sm text-white/50">
          Логотип, баннер и фотографии мероприятий в публичном профиле и в каталоге вакансий.
        </p>
      </div>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold text-white">Логотип компании</h2>
        <p className="mt-1 text-xs text-white/45">
          Рекомендуем квадратное изображение от 256×256, PNG/JPG/WebP, до 5 МБ.
        </p>
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/20">
            {pack?.logo?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pack.logo.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <EmployerLogoMark
                size="xxl"
                companyName={companyName}
                contactName={contactName}
                logoUrl={null}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInput}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) handleFilePickForCrop(f, 'COMPANY_LOGO', 1, setLogoProg);
              }}
            />
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-input border border-white/15 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Upload className="h-4 w-4" />
              {pack?.logo ? 'Заменить' : 'Загрузить'}
            </button>
            {pack?.logo ? (
              <button
                type="button"
                onClick={() => void deleteMedia(pack.logo, 'logo')}
                className="inline-flex items-center gap-2 rounded-input border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500/60"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            ) : null}
          </div>
        </div>
        {logoProg > 0 ? (
          <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${logoProg}%` }} />
          </div>
        ) : null}
      </section>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-5">
        <h2 className="text-base font-semibold text-white">Баннер компании</h2>
        <p className="mt-1 text-xs text-white/45">Рекомендуем 1920×1080 (16:9), до 5 МБ.</p>
        <div className="mt-4 aspect-video w-full max-w-[640px] overflow-hidden rounded-xl border border-white/15 bg-black/25">
          {pack?.banner?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pack.banner.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => bannerInput.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-white/45 hover:bg-white/[0.03]"
            >
              <Upload className="h-8 w-8" />
              Нажмите для выбора файла
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={bannerInput}
            type="file"
            accept={ACCEPT_IMAGES}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handleFilePickForCrop(f, 'COMPANY_BANNER', 16/9, setBannerProg);
            }}
          />
          <button
            type="button"
            onClick={() => bannerInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-input border border-white/15 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/[0.06]"
          >
            {pack?.banner ? 'Заменить баннер' : 'Загрузить баннер'}
          </button>
          {pack?.banner ? (
            <button
              type="button"
              onClick={() => void deleteMedia(pack.banner, 'banner')}
              className="inline-flex items-center gap-2 rounded-input border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500/60"
            >
              <Trash2 className="h-4 w-4" /> Удалить
            </button>
          ) : null}
        </div>
        {bannerProg > 0 ? (
          <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${bannerProg}%` }} />
          </div>
        ) : null}
      </section>

      <section className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Галерея мероприятий</h2>
            <p className="mt-1 text-xs text-white/45">
              До {GALLERY_MAX} фото. Форматы как у баннера, до 5 МБ каждое.
            </p>
          </div>
          <span className="text-sm font-medium text-emerald-200/90">
            {galleryCount}/{GALLERY_MAX}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallerySorted.map((g) => (
            <div
              key={g.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/15 bg-black/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url ?? ''} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  aria-label="Удалить фото"
                  onClick={() => void deleteMedia(g, 'gallery')}
                  className="rounded-full bg-red-600 p-2 text-white hover:bg-red-700"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}

          <div>
            <input
              ref={galleryInput}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void uploadKind(f, 'COMPANY_GALLERY', setGalleryProg);
              }}
            />
            <button
              type="button"
              disabled={galleryCount >= GALLERY_MAX}
              onClick={() => galleryInput.current?.click()}
              title={galleryCount >= GALLERY_MAX ? 'Удалите фото чтобы добавить новое' : undefined}
              className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 text-sm ${
                galleryCount >= GALLERY_MAX
                  ? 'cursor-not-allowed text-white/30'
                  : 'text-white/60 hover:border-emerald-500/40 hover:bg-white/[0.04]'
              }`}
            >
              <ImagePlus className="h-8 w-8" />+ Добавить
            </button>
          </div>
        </div>
        {galleryCount >= GALLERY_MAX ? (
          <p className="mt-3 text-xs text-amber-200/80">Удалите фото чтобы добавить новое.</p>
        ) : null}
        {galleryProg > 0 ? (
          <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${galleryProg}%` }} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
