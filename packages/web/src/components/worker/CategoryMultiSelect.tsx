'use client';

import { useState } from 'react';
import { STAFF_CATEGORIES, WORKER_LEVELS } from '@unity/shared';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { X, Plus, ChevronDown } from 'lucide-react';

const MAX_CATEGORIES = 5;

type CategoryKey = keyof typeof STAFF_CATEGORIES;
type LevelKey = keyof typeof WORKER_LEVELS;

export interface WorkerCategoryItem {
  id: string;
  category: string;
  level: string;
  specialization?: string | null;
}

interface CategoryMultiSelectProps {
  initial: WorkerCategoryItem[];
  onChange?: (categories: WorkerCategoryItem[]) => void;
}

const CATEGORY_OPTIONS = Object.entries(STAFF_CATEGORIES).map(([value, label]) => ({
  value: value as CategoryKey,
  label,
}));

const LEVEL_OPTIONS = Object.entries(WORKER_LEVELS).map(([value, label]) => ({
  value: value as LevelKey,
  label,
}));

export function CategoryMultiSelect({ initial, onChange }: CategoryMultiSelectProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<WorkerCategoryItem[]>(initial);
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryKey>(CATEGORY_OPTIONS[0].value);
  const [newLevel, setNewLevel] = useState<LevelKey>('beginner');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const usedCategories = new Set(categories.map((c) => c.category));

  const availableOptions = CATEGORY_OPTIONS.filter((o) => !usedCategories.has(o.value));

  const handleAdd = async () => {
    if (categories.length >= MAX_CATEGORIES) {
      toast(`Максимум ${MAX_CATEGORIES} категорий`, 'error');
      return;
    }
    // Берём реально доступную (ещё не выбранную) категорию: значение селекта могло
    // остаться от прошлого добавления и совпасть с уже добавленной — тогда upsert
    // на бэке обновил бы ту же строку, и новая категория «пропадала» бы.
    const categoryToAdd = usedCategories.has(newCategory)
      ? availableOptions[0]?.value
      : newCategory;
    if (!categoryToAdd) {
      toast('Все категории уже добавлены', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post<{ data: WorkerCategoryItem }>('/worker/categories', {
        category: categoryToAdd,
        level: newLevel,
      });
      const updated = [...categories, res.data];
      setCategories(updated);
      onChange?.(updated);
      setAdding(false);
      setShowDropdown(false);
      toast('Категория добавлена', 'success');
    } catch {
      toast('Ошибка добавления категории', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await apiClient.delete(`/worker/categories/${id}`);
      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      onChange?.(updated);
      toast('Категория удалена', 'success');
    } catch {
      toast('Ошибка удаления категории', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-white/70">
          Специализация{' '}
          <span className="text-white/30">
            ({categories.length}/{MAX_CATEGORIES})
          </span>
        </label>
      </div>

      {/* Existing categories as pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const label = STAFF_CATEGORIES[cat.category as CategoryKey] ?? cat.category;
          const levelLabel = WORKER_LEVELS[cat.level as LevelKey] ?? cat.level;
          return (
            <div
              key={cat.id}
              className="flex items-center gap-1.5 rounded-badge border border-primary-400/30 bg-primary-500/10 px-3 py-1 text-sm text-primary-200"
            >
              <span>{label}</span>
              <span className="text-primary-400/60">·</span>
              <span className="text-xs text-primary-300/70">{levelLabel}</span>
              <button
                type="button"
                onClick={() => handleRemove(cat.id)}
                disabled={removingId === cat.id}
                className="ml-1 rounded-full p-0.5 text-primary-300/60 hover:bg-primary-400/20 hover:text-primary-200 disabled:opacity-40"
                aria-label={`Удалить ${label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {/* Add button */}
        {categories.length < MAX_CATEGORIES && !adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setShowDropdown(true);
              // Синхронизируем стартовое значение селекта с реально доступными опциями,
              // иначе сабмит ушёл бы со старым (уже добавленным) значением.
              if (availableOptions[0]) setNewCategory(availableOptions[0].value);
            }}
            className="flex items-center gap-1 rounded-badge border border-dashed border-white/20 px-3 py-1 text-sm text-white/40 hover:border-white/40 hover:text-white/70"
          >
            <Plus className="h-3.5 w-3.5" /> Добавить
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mt-3 rounded-input border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-white/50">Категория</label>
              <div className="relative">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as CategoryKey)}
                  className="w-full appearance-none rounded-input border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-primary-400/50 focus:outline-none"
                >
                  {availableOptions.map((o) => (
                    <option key={o.value} value={o.value} className="bg-gray-900">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/50">Уровень</label>
              <div className="relative">
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value as LevelKey)}
                  className="w-full appearance-none rounded-input border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-primary-400/50 focus:outline-none"
                >
                  {LEVEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-gray-900">
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 rounded-input border border-white/10 py-2 text-xs text-white/60 hover:border-white/30"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || availableOptions.length === 0}
              className="flex-1 rounded-input bg-primary-500 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? 'Добавляем...' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 && !adding && (
        <p className="mt-2 text-xs text-white/30">
          Добавьте хотя бы одну категорию для публикации анкеты
        </p>
      )}
    </div>
  );
}
