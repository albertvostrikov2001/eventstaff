'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Edit2, Trash2, Copy, Lock, X, ChevronRight } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VacancyData {
  title?: string;
  description?: string;
  requirements?: string;
  rate?: number;
  category?: string;
  rateType?: string;
  employmentType?: string;
  address?: string;
  workersNeeded?: number;
}

interface Template {
  id: string;
  name: string;
  vacancyData: VacancyData;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesResponse {
  templates: Template[];
  used: number;
  limit: number;
  canCreate: boolean;
  planKey: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface TemplateModalProps {
  template: Template | null;
  onClose: () => void;
  onSave: (name: string, vacancyData: VacancyData) => Promise<void>;
}

function TemplateModal({ template, onClose, onSave }: TemplateModalProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [title, setTitle] = useState(String(template?.vacancyData?.title ?? ''));
  const [description, setDescription] = useState(String(template?.vacancyData?.description ?? ''));
  const [requirements, setRequirements] = useState(String(template?.vacancyData?.requirements ?? ''));
  const [rate, setRate] = useState(String(template?.vacancyData?.rate ?? ''));
  const [category, setCategory] = useState(String(template?.vacancyData?.category ?? ''));
  const [rateType, setRateType] = useState(String(template?.vacancyData?.rateType ?? 'per_shift'));
  const [employmentType, setEmploymentType] = useState(String(template?.vacancyData?.employmentType ?? 'single_shift'));
  const [address, setAddress] = useState(String(template?.vacancyData?.address ?? ''));
  const [workersNeeded, setWorkersNeeded] = useState(String(template?.vacancyData?.workersNeeded ?? '1'));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(name, {
        title: title || undefined,
        description: description || undefined,
        requirements: requirements || undefined,
        rate: rate ? Number(rate) : undefined,
        category: category || undefined,
        rateType: rateType || undefined,
        employmentType: employmentType || undefined,
        address: address || undefined,
        workersNeeded: workersNeeded ? Number(workersNeeded) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-input border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary-500/50 focus:outline-none focus:ring-1 focus:ring-primary-500/30';
  const labelClass = 'block text-xs font-medium text-[var(--text-secondary)] mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1a10] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {template ? 'Редактировать шаблон' : 'Новый шаблон'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className={labelClass}>
              Название шаблона <span className="text-red-400">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Официант на банкет"
              className={inputClass}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Заголовок вакансии</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Официант"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Категория</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">— выберите —</option>
                <option value="waiter">Официант</option>
                <option value="bartender">Бармен</option>
                <option value="cook">Повар</option>
                <option value="administrator">Администратор</option>
                <option value="coordinator">Координатор</option>
                <option value="hostess">Хостес</option>
                <option value="cleaner">Уборщик</option>
                <option value="other">Другое</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Ставка (₽)</label>
              <input
                type="number"
                min={0}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="2000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Тип ставки</label>
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
                className={inputClass}
              >
                <option value="per_shift">За смену</option>
                <option value="monthly">За месяц</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Нужно человек</label>
              <input
                type="number"
                min={1}
                value={workersNeeded}
                onChange={(e) => setWorkersNeeded(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Тип занятости</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className={inputClass}
            >
              <option value="single_shift">Разовая смена</option>
              <option value="series">Серия смен</option>
              <option value="permanent">Постоянная</option>
              <option value="part_time">Частичная занятость</option>
              <option value="project">Проект</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Адрес</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ул. Пушкина, д. 1"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Описание вакансии</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Опишите задачи и условия..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className={labelClass}>Требования</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={2}
              placeholder="Опыт от 1 года, наличие медкнижки..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-white/10 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/[0.06]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-input bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Сохраняем...' : template ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const { toast: showToast } = useToast();

  const [data, setData] = useState<TemplatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: TemplatesResponse }>('/employer/templates');
      setData(res.data);
    } catch {
      showToast('Не удалось загрузить шаблоны', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (name: string, vacancyData: VacancyData) => {
    try {
      if (editingTemplate) {
        await apiClient.put(`/employer/templates/${editingTemplate.id}`, { name, vacancyData });
        showToast('Шаблон обновлён', 'success');
      } else {
        await apiClient.post('/employer/templates', { name, vacancyData });
        showToast('Шаблон создан', 'success');
      }
      setModalOpen(false);
      setEditingTemplate(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, 'error');
      } else {
        showToast('Не удалось сохранить шаблон', 'error');
      }
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот шаблон?')) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/employer/templates/${id}`);
      showToast('Шаблон удалён', 'success');
      await load();
    } catch {
      showToast('Не удалось удалить шаблон', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUse = async (id: string) => {
    setUsingId(id);
    try {
      const res = await apiClient.post<{ data: { id: string } }>(`/employer/templates/${id}/use`);
      showToast('Вакансия создана из шаблона', 'success');
      router.push(`/employer/vacancies/${res.data.id}/edit`);
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, 'error');
      } else {
        showToast('Не удалось создать вакансию', 'error');
      }
    } finally {
      setUsingId(null);
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setModalOpen(true);
  };

  const isLocked = data?.planKey === 'free';
  const limitLabel =
    data?.limit === -1
      ? 'Безлимитно'
      : `${data?.used ?? 0} / ${data?.limit ?? 0}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Шаблоны вакансий</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Сохраняйте часто используемые настройки вакансий и создавайте черновики в один клик
          </p>
        </div>
        {!isLocked && (
          <button
            onClick={openCreate}
            disabled={!data?.canCreate}
            className="flex items-center gap-2 rounded-input bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Новый шаблон
          </button>
        )}
      </div>

      {/* Locked state */}
      {isLocked && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Шаблоны доступны с тарифа Бизнес
          </h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Создавайте до 5 шаблонов на тарифе Бизнес или неограниченное количество на тарифе Про
          </p>
          <a
            href="/employer/subscription"
            className="mt-4 inline-flex items-center gap-2 rounded-input bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Улучшить тариф
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Limit counter */}
      {!isLocked && data && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            Использовано шаблонов: <span className="font-semibold text-[var(--text-primary)]">{limitLabel}</span>
          </span>
          {!data.canCreate && data.limit !== -1 && (
            <span className="ml-auto text-xs text-amber-400">
              Лимит исчерпан — перейдите на Про для безлимитных шаблонов
            </span>
          )}
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : !isLocked && (data?.templates.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center">
          <FileText className="h-12 w-12 text-[var(--text-muted)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Шаблонов пока нет</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Создайте первый шаблон, чтобы быстро публиковать похожие вакансии
          </p>
          <button
            onClick={openCreate}
            className="mt-2 flex items-center gap-2 rounded-input bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Создать шаблон
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.templates.map((t) => (
            <div
              key={t.id}
              className="group rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary-400" />
                    <span className="font-semibold text-[var(--text-primary)] truncate">{t.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[var(--text-muted)]">
                    {t.vacancyData.title && <span>Заголовок: {t.vacancyData.title}</span>}
                    {t.vacancyData.category && <span>Категория: {t.vacancyData.category}</span>}
                    {t.vacancyData.rate !== undefined && (
                      <span>
                        Ставка: {t.vacancyData.rate} ₽{t.vacancyData.rateType === 'per_shift' ? '/смена' : t.vacancyData.rateType === 'monthly' ? '/мес' : t.vacancyData.rateType === 'hourly' ? '/час' : ''}
                      </span>
                    )}
                    <span>Обновлён {new Date(t.updatedAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => handleUse(t.id)}
                    disabled={usingId === t.id}
                    title="Создать вакансию из шаблона"
                    className="flex items-center gap-1.5 rounded-input border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-medium text-primary-400 transition hover:bg-primary-500/20 disabled:opacity-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {usingId === t.id ? 'Создаём...' : 'Использовать'}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    title="Редактировать"
                    className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    title="Удалить"
                    className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
