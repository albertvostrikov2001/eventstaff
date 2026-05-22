'use client';

import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, isBefore, isValid, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { AlertCircle, CalendarDays, Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { EmployerFormVariant } from '@/components/forms/form-styles';
import {
  formControlCn,
  formHelperRowCn,
  formLabelCn,
  formRequiredAsteriskCn,
} from '@/components/forms/form-styles';
import { formatDateTimeRu } from '@/lib/dates/formatDateTime';
import { cn } from '@/lib/utils';

import 'react-day-picker/dist/style.css';

export interface FormDateTimePickerProps {
  variant?: EmployerFormVariant;
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  /** ISO строка; опционально '' для сброса конца интервала. */
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** Если задан — итоговый момент не будет раньше этого времени при выборе календаря/времени. */
  minDateTime?: Date;
  placeholder?: string;
  id?: string;
  clearable?: boolean;
}

function combineLocalDateAndTime(day: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mi = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mi) || hh > 23 || mi > 59) return null;
  return setMinutes(setHours(day, hh), mi);
}

function defaultHHMMFromMin(min?: Date): string {
  if (!min) return '09:00';
  return format(min, 'HH:mm');
}

export function FormDateTimePicker({
  variant = 'cabinet',
  label,
  helper,
  error,
  required,
  value,
  onChange,
  onBlur,
  disabled,
  minDateTime,
  placeholder = 'Выберите дату и время',
  id,
  clearable,
}: FormDateTimePickerProps) {
  const fieldId = id ?? label.replace(/\s+/g, '-').toLowerCase();
  const tone = error ? 'error' : ('default' as const);
  const isRequired = Boolean(required);

  const frozenMinRef = useRef<Date | undefined>(undefined);
  if (!frozenMinRef.current && minDateTime) frozenMinRef.current = minDateTime;
  const floor = frozenMinRef.current ?? minDateTime;

  const parsedValue = value?.trim() ? parseISO(value) : undefined;
  const parsedValid = Boolean(parsedValue && isValid(parsedValue));

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(() =>
    parsedValid && parsedValue ? startOfDay(parsedValue) : undefined,
  );
  const [hhmm, setHhmm] = useState(() =>
    parsedValid && parsedValue ? format(parsedValue, 'HH:mm') : defaultHHMMFromMin(floor),
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value?.trim()) {
      setSelectedDay(undefined);
      setHhmm(defaultHHMMFromMin(frozenMinRef.current ?? minDateTime));
      return;
    }
    const d = parseISO(value);
    if (!isValid(d)) return;
    setSelectedDay(startOfDay(d));
    setHhmm(format(d, 'HH:mm'));
  }, [value, minDateTime]);

  const displayText =
    parsedValid && parsedValue ? formatDateTimeRu(parsedValue, 'long') : '';

  const commitDayAndTime = (day: Date, timeStr: string) => {
    const combined = combineLocalDateAndTime(day, timeStr);
    if (!combined) return;
    const finalDt = floor && isBefore(combined, floor) ? floor : combined;
    onChange(finalDt.toISOString());
  };

  const handlePickDay = (d?: Date) => {
    if (!d) return;
    const sod = startOfDay(d);
    if (floor && isBefore(startOfDay(sod), startOfDay(floor))) return;
    setSelectedDay(sod);
    const timeStr =
      floor && sod.getTime() === startOfDay(floor).getTime()
        ? defaultHHMMFromMin(floor)
        : hhmm.trim() || defaultHHMMFromMin(floor);
    setHhmm(timeStr);
    commitDayAndTime(sod, timeStr);
  };

  const handlePickTime = (next: string) => {
    setHhmm(next);
    if (selectedDay) commitDayAndTime(selectedDay, next);
  };

  const minCalendar = floor;

  const handleClear = () => {
    setSelectedDay(undefined);
    setHhmm(defaultHHMMFromMin(frozenMinRef.current ?? minDateTime));
    onChange('');
    setOpen(false);
  };

  return (
    <div className={variant === 'cabinet' ? 'min-w-0' : ''}>
      <span className={formLabelCn(variant)}>
        <span>{label}</span>
        {isRequired && <span className={formRequiredAsteriskCn(variant)} aria-hidden>*</span>}
      </span>

      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="dialog"
            onBlur={() => onBlur?.()}
            className={cn(
              formControlCn(variant, tone, { disabled }),
              'flex min-h-[46px] w-full cursor-pointer items-center justify-between gap-2 px-4 text-left',
            )}
          >
            <span
              className={cn(
                'truncate text-sm',
                !displayText && variant === 'cabinet'
                  ? 'text-white/[0.42]'
                  : !displayText
                    ? 'text-gray-400'
                    : variant === 'cabinet'
                      ? 'text-white/90'
                      : 'text-gray-900',
              )}
            >
              {displayText || placeholder}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            id={`${fieldId}-datepicker`}
            aria-labelledby={fieldId}
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              'z-[100] rounded-[14px] border border-white/10 p-4 shadow-2xl',
              'backdrop-blur-[16px]',
            )}
            style={{ backgroundColor: 'rgba(13, 31, 23, 0.98)' }}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DayPicker
              mode="single"
              locale={ru}
              selected={selectedDay}
              onSelect={handlePickDay}
              disabled={minCalendar ? { before: startOfDay(minCalendar) } : undefined}
              classNames={{
                months: 'text-white text-sm',
                caption_label: 'text-white/95 font-semibold capitalize',
                head_cell:
                  'w-9 py-2 text-[0.7rem] font-medium uppercase tracking-wide text-white/38',
                day: cn(
                  'h-9 w-9 rounded-[10px] text-sm transition-colors hover:bg-white/[0.06]',
                  'aria-selected:bg-[#2d6a4a] aria-selected:!text-white',
                ),
                day_selected:
                  '!bg-[#2d6a4a] !text-white hover:!bg-[#2d6a4a] focus-visible:ring-2 ring-[#2d6a4a]/40',
                day_disabled: 'pointer-events-none !text-white/15',
                nav_button:
                  'h-9 w-9 rounded-[10px] text-white/50 transition hover:bg-white/[0.08] hover:text-white',
              }}
              showOutsideDays
            />

            <div className="mt-3 flex items-center gap-2 border-t border-white/[0.08] pt-4">
              <Clock className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
              <input
                type="time"
                step={300}
                value={hhmm}
                disabled={disabled || !selectedDay}
                onChange={(e) => handlePickTime(e.target.value)}
                className={cn(
                  'flex-1 rounded-[10px] border border-white/[0.12]',
                  'bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition',
                  'focus:border-[#2d6a4a]/80',
                  (!selectedDay || disabled) && 'cursor-not-allowed opacity-35',
                )}
              />
              {clearable && value.trim() !== '' && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleClear}
                  className={cn(
                    'shrink-0 rounded-[10px] border border-white/12 px-2.5 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.06]',
                    disabled && 'opacity-35',
                  )}
                >
                  Сбросить
                </button>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {!error && helper && <p className={formHelperRowCn(variant)}>{helper}</p>}
      {error && (
        <p role="alert" className={formHelperRowCn(variant, true)}>
          <AlertCircle className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
