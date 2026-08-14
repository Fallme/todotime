import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import type { TaskRecurrence } from '../../types';
import { buildMonthlyRecurrence, getMonthlyRecurrenceDays } from '../../utils/taskRecurrence';
import { useLanguage } from '../../i18n/LanguageContext';

interface MonthlyRecurrenceCalendarProps {
  recurrence: TaskRecurrence;
  onChange: (recurrence: TaskRecurrence) => void;
  compact?: boolean;
}

export function MonthlyRecurrenceCalendar({ recurrence, onChange, compact = false }: MonthlyRecurrenceCalendarProps) {
  const { language } = useLanguage();
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDays = getMonthlyRecurrenceDays(recurrence);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const toggleDay = (day: number) => {
    const next = selectedDays.includes(day)
      ? selectedDays.length > 1 ? selectedDays.filter(value => value !== day) : selectedDays
      : [...selectedDays, day];
    onChange(buildMonthlyRecurrence(next));
  };

  const summary = selectedDays.length > 0
    ? msg(`${selectedDays.join('、')} 号`, `Days ${selectedDays.join(', ')}`)
    : msg('选择日期', 'Choose dates');

  return (
    <div className={`monthly-calendar${compact ? ' compact' : ''}`} ref={rootRef}>
      <button className="monthly-calendar-trigger" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        <CalendarDays size={14} />
        <span>{summary}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="monthly-calendar-popover" role="dialog" aria-label={msg('选择每月刷新日期', 'Choose monthly refresh dates')}>
          <div className="monthly-calendar-heading">
            <strong>{msg('每月刷新日期', 'Monthly refresh dates')}</strong>
            <small>{msg('可多选', 'Multiple')}</small>
          </div>
          <div className="monthly-calendar-grid">
            {Array.from({ length: 31 }, (_, index) => index + 1).map(day => (
              <button key={day} type="button" className={selectedDays.includes(day) ? 'active' : ''}
                aria-pressed={selectedDays.includes(day)} onClick={() => toggleDay(day)}>{day}</button>
            ))}
          </div>
          <p>{msg('所选日期到期后，任务会重新恢复。', 'The task reopens on each selected date.')}</p>
        </div>
      )}
    </div>
  );
}
