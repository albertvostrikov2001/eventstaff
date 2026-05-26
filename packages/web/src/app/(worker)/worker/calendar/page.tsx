'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { ChevronLeft, ChevronRight, Save, AlertTriangle, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AvailabilitySlot {
  date: string;
  isBlocked: boolean;
}

interface ShiftRow {
  id: string;
  status: string;
  booking: {
    date: string;
    linkedVacancy?: { title: string; dateStart: string | null } | null;
  };
}

type DayState = 'available' | 'blocked' | 'unset';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const BOOKED_STATUSES = new Set(['PENDING', 'ACTIVE', 'DISPUTED', 'COMPLETED']);

export default function WorkerCalendarPage() {
  const { toast } = useToast();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [slots, setSlots] = useState<Map<string, DayState>>(new Map());
  const [bookedDates, setBookedDates] = useState<Map<string, ShiftRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflictDate, setConflictDate] = useState<string | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const [availRes, shiftsRes] = await Promise.all([
        apiClient.get<{ data: AvailabilitySlot[] }>('/worker/availability', { month: monthStr }),
        apiClient.get<{ data: ShiftRow[] }>('/worker/shifts', { page: 1 }),
      ]);
      const map = new Map<string, DayState>();
      availRes.data.forEach((slot) => {
        const d = toDateString(new Date(slot.date));
        map.set(d, slot.isBlocked ? 'blocked' : 'available');
      });
      setSlots(map);

      const booked = new Map<string, ShiftRow>();
      for (const shift of shiftsRes.data ?? []) {
        if (!BOOKED_STATUSES.has(shift.status)) continue;
        const raw = shift.booking.linkedVacancy?.dateStart ?? shift.booking.date;
        if (!raw) continue;
        const d = toDateString(new Date(raw));
        booked.set(d, shift);
      }
      setBookedDates(booked);
      setDirty(false);
      setConflictDate(null);
    } catch {
      toast('Ошибка загрузки календаря', 'error');
    } finally {
      setLoading(false);
    }
  }, [monthStr, toast]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const upcomingShifts = useMemo(() => {
    return Array.from(bookedDates.entries())
      .filter(([d]) => d >= todayStr)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 5);
  }, [bookedDates, todayStr]);

  const toggleDay = (dateStr: string) => {
    const past = new Date(dateStr) < new Date(todayStr);
    if (past) return;
    if (bookedDates.has(dateStr)) {
      setConflictDate(dateStr);
      toast('На эту дату уже запланирована смена', 'error');
      return;
    }
    setConflictDate(null);
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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white/90">Календарь занятости</h1>
          <p className="mt-1 text-sm text-white/50">
            Отметьте свои свободные и занятые дни.
          </p>
        </div>
        {dirty && (
          <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        )}
      </div>

      {/* ── Instruction card ── */}
      <div className="mt-4 rounded-[12px] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-white/40">Как пользоваться</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/60">
          <span className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-emerald-500/25 text-[10px] text-emerald-200">1×</span>
            Нажмите — <span className="text-emerald-300 font-medium">Свободен</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-white/15 text-[10px] text-white/60">2×</span>
            Ещё раз — <span className="text-white/80 font-medium">Занят</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] border border-white/15 text-[10px] text-white/40">3×</span>
            Третий раз — убрать отметку
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-indigo-500/25 text-[10px] text-indigo-200">★</span>
            Смены от работодателя проставляются автоматически
          </span>
        </div>
      </div>

      {conflictDate ? (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-white/65">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {conflictDate}: дата занята подтверждённой сменой. Измените availability только если смена отменена.
          </span>
        </div>
      ) : null}

      <div className="mt-4 rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={prevMonth} className="rounded-input p-1 text-white/65 hover:bg-white/[0.06]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-white/90">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button type="button" onClick={nextMonth} className="rounded-input p-1 text-white/65 hover:bg-white/[0.06]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-white/40">
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
            const isBooked = bookedDates.has(dateStr);
            const isPast = new Date(dateStr) < new Date(todayStr);
            const isConflict = conflictDate === dateStr;
            const isToday = dateStr === todayStr;

            let cls =
              'h-8 w-full rounded-[7px] text-xs font-medium transition focus:outline-none focus:ring-1 focus:ring-emerald-500/40';
            if (isPast) {
              cls += ' cursor-not-allowed text-white/25';
            } else if (isBooked) {
              cls += ' cursor-not-allowed bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40';
            } else if (isConflict) {
              cls += ' bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/50';
            } else if (state === 'available') {
              cls += ' bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30';
            } else if (state === 'blocked') {
              cls += ' bg-white/10 text-white/50 hover:bg-white/15';
            } else {
              cls += isToday
                ? ' ring-1 ring-white/30 text-white/80 hover:bg-white/[0.06]'
                : ' text-white/60 hover:bg-white/[0.06]';
            }

            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(dateStr)}
                disabled={isPast || isBooked || loading}
                className={cls}
                title={isBooked ? 'Подтверждённая смена' : undefined}
              >
                {day}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-white/45">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30" />
            Доступен
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/15" />
            Занят
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500/30 ring-1 ring-indigo-400/40" />
            Смена
          </span>
        </div>
      </div>

      {upcomingShifts.length > 0 ? (
        <div className="mt-6 rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/90">
            <Briefcase className="h-4 w-4 text-emerald-400" />
            Предстоящие смены
          </h3>
          <ul className="space-y-2">
            {upcomingShifts.map(([date, shift]) => (
              <li
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-white/[0.03] px-3 py-2 text-sm"
              >
                <span className="text-white/65">
                  {new Date(date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    weekday: 'short',
                  })}
                </span>
                <span className="text-white/50">
                  {shift.booking.linkedVacancy?.title ?? 'Смена'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
