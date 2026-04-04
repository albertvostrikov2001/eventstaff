'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';

interface AvailabilitySlot {
  date: string;
  isBlocked: boolean;
}

type DayState = 'available' | 'blocked' | 'unset';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export default function WorkerCalendarPage() {
  const { toast } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState<Map<string, DayState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: AvailabilitySlot[] }>(
        '/worker/availability',
        { month: monthStr },
      );
      const map = new Map<string, DayState>();
      res.data.forEach((slot) => {
        const d = toDateString(new Date(slot.date));
        map.set(d, slot.isBlocked ? 'blocked' : 'available');
      });
      setSlots(map);
      setDirty(false);
    } catch {
      toast('Ошибка загрузки календаря', 'error');
    } finally {
      setLoading(false);
    }
  }, [monthStr, toast]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const toggleDay = (dateStr: string) => {
    const past = new Date(dateStr) < new Date(toDateString(today));
    if (past) return;
    setSlots((prev) => {
      const copy = new Map(prev);
      const current = copy.get(dateStr) ?? 'unset';
      const next: DayState =
        current === 'unset' ? 'available' : current === 'available' ? 'blocked' : 'unset';
      if (next === 'unset') copy.delete(dateStr);
      else copy.set(dateStr, next);
      return copy;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const slotsArr = Array.from(slots.entries()).map(([date, state]) => ({
        date,
        isAvailable: state === 'available',
      }));
      await apiClient.post('/worker/availability', { slots: slotsArr });
      toast('Календарь сохранён', 'success');
      setDirty(false);
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // TODO: интеграция с Application booking — блокировка занятых дат при приёме отклика (следующий этап)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Календарь занятости</h1>
          <p className="mt-1 text-sm text-gray-500">Отметьте дни, когда вы доступны для работы</p>
        </div>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-input bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        )}
      </div>

      <div className="mt-6 rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-input p-1.5 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button onClick={nextMonth} className="rounded-input p-1.5 hover:bg-gray-100">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const state = slots.get(dateStr) ?? 'unset';
            const isPast = new Date(dateStr) < new Date(toDateString(today));
            return (
              <button
                key={day}
                onClick={() => toggleDay(dateStr)}
                disabled={isPast || loading}
                className={`aspect-square rounded-card text-sm font-medium transition ${
                  isPast
                    ? 'cursor-not-allowed text-gray-300'
                    : state === 'available'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : state === 'blocked'
                    ? 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-green-200" />
            Доступен
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-gray-300" />
            Занят
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-gray-200" />
            Не указано
          </span>
        </div>
      </div>
    </div>
  );
}
