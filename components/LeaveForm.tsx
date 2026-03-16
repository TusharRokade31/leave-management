"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronRight, Briefcase, Sparkles, X, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { LeaveFormData } from '@/type/form';
import { toast } from 'react-toastify';
import { getHoliday, findOptionalInStates } from '@/lib/holidays';
import { format, isSameDay, isBefore, startOfDay, parseISO } from "date-fns";

interface LeaveFormProps {
  onSubmit: (formData: LeaveFormData) => Promise<void>;
  onCancel: () => void;
  existingLeaves: any[];
}

export const LeaveForm: React.FC<LeaveFormProps> = ({ onSubmit, onCancel, existingLeaves }) => {
  const [formData, setFormData] = useState<LeaveFormData>({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'FULL',
    startTime: '',
    endTime: '',
    slot: ''
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOptionalLeave, setIsOptionalLeave] = useState<boolean>(false);

  const [clickStage, setClickStage] = useState<'start' | 'end'>('start');
  const [blockedHoliday, setBlockedHoliday] = useState<string | null>(null);
  const [blockedLeaveDate, setBlockedLeaveDate] = useState<string | null>(null);
  const [fixedHolidaysInRange, setFixedHolidaysInRange] = useState<{ date: string; name: string; isHalfDay?: boolean }[]>([]);
  const [clickedOptionalHoliday, setClickedOptionalHoliday] = useState<{ date: string; name: string } | null>(null);
  const [tappedHolidayName, setTappedHolidayName] = useState<string | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  const hasUsedApprovedOptional = useMemo(() => {
    if (!existingLeaves || !Array.isArray(existingLeaves)) return false;
    const currentYear = new Date().getFullYear();
    return existingLeaves.some(l => {
      const rawDate = l.startDate ? String(l.startDate).slice(0, 10) : null;
      if (!rawDate) return false;
      const [y] = rawDate.split('-').map(Number);
      const isThisYear = y === currentYear;
      const isApproved = l.status?.toUpperCase() === 'APPROVED' || l.status?.toUpperCase() === 'PENDING';
      if (!isThisYear || !isApproved) return false;
      return l.isOptional === true || l.type === 'OPTIONAL' || (typeof l.holidayName === 'string' && l.holidayName.trim() !== '');
    });
  }, [existingLeaves]);

  const stringToDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  };

  const dateToString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCalendarChange = (value: any) => {};

  const getFixedHolidaysInRange = (start: string, end: string): { date: string; name: string; isHalfDay?: boolean }[] => {
    const result: { date: string; name: string; isHalfDay?: boolean }[] = [];
    const cur = stringToDate(start)!;
    const endD = stringToDate(end)!;
    while (cur <= endD) {
      const key = dateToString(cur);
      const h = getHoliday(key);
      if (h?.type === 'FIXED') result.push({ date: key, name: h.name, isHalfDay: h.isHalfDay });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  };

  const handleDayClick = (date: Date) => {
    const isSingleDayMode = ['HALF', 'EARLY', 'LATE'].includes(formData.type);
    const key = dateToString(date);
    const today = startOfDay(new Date());
    const clickedDay = startOfDay(date);

    const holiday = getHoliday(key);

    // Show holiday name banner (mobile-friendly)
    if (holiday) {
      setTappedHolidayName(holiday.name);
      setTimeout(() => setTappedHolidayName(null), 2500);
    } else {
      setTappedHolidayName(null);
    }

    if (isBefore(clickedDay, today)) return;

    // Block if date already has an approved/pending leave —
    // BUT allow optional holidays through so user can apply optional quota
    const isOptionalHolidayDate = holiday?.type === 'OPTIONAL';
    if (approvedLeaveDates.has(key) && !isOptionalHolidayDate) {
      setBlockedLeaveDate(key);
      setBlockedHoliday(null);
      setFixedHolidaysInRange([]);
      setClickedOptionalHoliday(null);
      return;
    }
    setBlockedLeaveDate(null);

    if (holiday?.type === 'FIXED' && !holiday.isHalfDay) {
      setBlockedHoliday(holiday.name);
      setFixedHolidaysInRange([]);
      setClickedOptionalHoliday(null);
      return;
    }

    if (holiday?.type === 'FIXED' && holiday.isHalfDay) {
      setBlockedHoliday(null);
      setClickedOptionalHoliday(null);
      setFixedHolidaysInRange([{ date: key, name: holiday.name, isHalfDay: true }]);
    } else if (holiday?.type === 'OPTIONAL') {
      setBlockedHoliday(null);
      setFixedHolidaysInRange([]);
      setClickedOptionalHoliday({ date: key, name: holiday.name });
    } else {
      setBlockedHoliday(null);
      setFixedHolidaysInRange([]);
      setClickedOptionalHoliday(null);
    }

    if (isSingleDayMode) {
      setFormData(prev => ({ ...prev, startDate: key, endDate: key }));
      return;
    }

    if (clickStage === 'start') {
      setFormData(prev => ({ ...prev, startDate: key, endDate: key }));
      setClickStage('end');
    } else {
      const startD = stringToDate(formData.startDate)!;
      let finalStart = formData.startDate;
      let finalEnd = key;
      if (isBefore(date, startD)) {
        finalStart = key;
        finalEnd = formData.startDate;
      }
      const holidays = getFixedHolidaysInRange(finalStart, finalEnd);
      setFixedHolidaysInRange(holidays);
      setFormData(prev => ({ ...prev, startDate: finalStart, endDate: finalEnd }));
      setClickStage('start');
    }
  };

  const leaveDates = useMemo((): Set<string> => {
    const s = new Set<string>();
    if (!existingLeaves || !Array.isArray(existingLeaves)) return s;
    existingLeaves.forEach(l => {
      const status = l.status?.toUpperCase();
      // Only show active leaves on calendar — skip rejected/deleted
      if (status === 'REJECTED' || status === 'DELETED' || status === 'CANCELLED') return;
      if (!l.startDate || !l.endDate) return;
      const start = new Date(String(l.startDate).slice(0, 10) + 'T12:00:00');
      const end   = new Date(String(l.endDate).slice(0, 10)   + 'T12:00:00');
      for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        s.add(`${y}-${m}-${d}`);
      }
    });
    return s;
  }, [existingLeaves]);

  // Only APPROVED or PENDING leaves — used to block re-application
  // Excludes optional holiday dates so users can re-apply optional quota on those days
  const approvedLeaveDates = useMemo((): Set<string> => {
    const s = new Set<string>();
    if (!existingLeaves || !Array.isArray(existingLeaves)) return s;
    existingLeaves.forEach(l => {
      const status = l.status?.toUpperCase();
      if (status !== 'APPROVED' && status !== 'PENDING') return;
      if (!l.startDate || !l.endDate) return;
      const start = new Date(String(l.startDate).slice(0, 10) + 'T12:00:00');
      const end   = new Date(String(l.endDate).slice(0, 10)   + 'T12:00:00');
      for (const cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        // Don't block optional holiday dates — user may want to apply optional quota
        const h = getHoliday(key);
        if (h?.type !== 'OPTIONAL') {
          s.add(key);
        }
      }
    });
    return s;
  }, [existingLeaves]);

  const detectedOptionalHolidays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return [];
    return findOptionalInStates(formData.startDate, formData.endDate);
  }, [formData.startDate, formData.endDate]);

  const startHoliday = useMemo(() => {
    return formData.startDate ? getHoliday(formData.startDate) : null;
  }, [formData.startDate]);

  useEffect(() => {
    if (startHoliday?.isHalfDay && formData.type !== 'HALF') {
      handleTypeChange('HALF');
      toast.info(`Note: ${startHoliday.name} is a half-day holiday.`);
    }
  }, [startHoliday]);

  useEffect(() => {
    if (formData.type !== 'FULL') {
      setIsOptionalLeave(false);
    }
  }, [formData.startDate, formData.endDate, formData.type]);

  const handleTypeChange = (type: LeaveFormData['type']): void => {
    setClickStage('start');
    setBlockedHoliday(null);
    setBlockedLeaveDate(null);
    setClickedOptionalHoliday(null);
    setFormData(prev => ({
      ...prev,
      type,
      endDate: ['HALF', 'EARLY', 'LATE'].includes(type) ? prev.startDate : prev.endDate,
      startTime: type === 'LATE' ? '10:00' : type === 'EARLY' ? '19:00' : '',
      endTime: '',
      slot: ''
    }));
  };

  const handleSlotChange = (slot: NonNullable<LeaveFormData['slot']>) => {
    const times: Record<string, { start: string; end: string }> = {
      FIRST_HALF: { start: '10:00', end: '14:30' },
      SECOND_HALF: { start: '14:30', end: '19:00' },
      CUSTOM: { start: '', end: '' }
    };
    const selectedTimes = times[slot] || { start: '', end: '' };
    setFormData(prev => ({ ...prev, slot, startTime: selectedTimes.start, endTime: selectedTimes.end }));
  };

  const handleSubmit = async (): Promise<void> => {
    const isSingleDay = ['HALF', 'EARLY', 'LATE'].includes(formData.type);
    const finalData = { ...formData, endDate: isSingleDay ? formData.startDate : formData.endDate };

    if (finalData.startDate) {
      const holiday = getHoliday(finalData.startDate);
      if (holiday?.type === 'FIXED' && !holiday.isHalfDay) {
        toast.error(`Blocked: ${holiday.name} is a full company holiday.`);
        return;
      }
    }

    if (!finalData.startDate || (!isSingleDay && !finalData.endDate) || !finalData.reason) {
      toast.error('Missing required fields');
      return;
    }

    // Block if any date in the selected range is already approved/pending
    // (optional holiday dates are exempt — user may be applying optional quota)
    if (finalData.startDate && finalData.endDate) {
      const rangeStart = stringToDate(finalData.startDate)!;
      const rangeEnd = stringToDate(finalData.endDate)!;
      for (const cur = new Date(rangeStart); cur <= rangeEnd; cur.setDate(cur.getDate() + 1)) {
        const key = dateToString(cur);
        const h = getHoliday(key);
        if (approvedLeaveDates.has(key) && h?.type !== 'OPTIONAL') {
          toast.error(`Leave already exists on ${new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}. Please select different dates.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...finalData,
        isOptional: isOptionalLeave && formData.type === 'FULL' && !hasUsedApprovedOptional,
        holidayName: isOptionalLeave && detectedOptionalHolidays.length === 1 ? detectedOptionalHolidays[0].name : null,
        reason: finalData.reason
      };
      await onSubmit(submitData as LeaveFormData);
      onCancel();
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = "w-full bg-slate-100/50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-2xl px-4 py-4 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all outline-none appearance-none font-bold text-base shadow-none dark:shadow-none";

  return (
    /* ── Outer scroll wrapper: full-height on mobile, scrollable ── */
    <div className="w-full min-h-screen sm:min-h-0 overflow-y-auto sm:overflow-visible px-0 sm:px-4 py-0 sm:py-4">
      <div className="max-w-3xl mx-auto">
        <style jsx global>{`
          * { -webkit-tap-highlight-color: transparent !important; }
          .dark input:-webkit-autofill {
            -webkit-text-fill-color: #f1f5f9;
            -webkit-box-shadow: 0 0 0px 1000px #1e293b inset;
          }
          .react-datepicker-wrapper { width: 100%; }
          button:focus, select:focus, input:focus { outline: none !important; }

          /* ── Calendar container ── */
          .leave-form-calendar {
            width: 100% !important;
            max-width: 380px !important;
            margin: 0 auto !important;
            background: transparent !important;
            border: none !important;
            font-family: inherit !important;
            box-sizing: border-box !important;
          }

          /* On mobile, stretch full-width */
          @media (max-width: 639px) {
            .leave-form-calendar {
              max-width: 100% !important;
            }
          }

          /* ── Hide double-arrow nav buttons ── */
          .leave-form-calendar .react-calendar__navigation__prev2-button,
          .leave-form-calendar .react-calendar__navigation__next2-button {
            display: none !important;
          }

          /* ── Navigation bar ── */
          .leave-form-calendar .react-calendar__navigation {
            display: flex !important;
            align-items: center !important;
            margin-bottom: 10px !important;
            background: transparent !important;
            height: auto !important;
          }
          .leave-form-calendar .react-calendar__navigation button {
            background: transparent !important;
            border: none !important;
            color: #6366f1 !important;
            font-weight: 800 !important;
            font-size: 13px !important;
            min-width: 32px !important;
            padding: 6px 8px !important;
            border-radius: 8px !important;
            transition: background 0.15s !important;
            line-height: 1 !important;
          }
          .leave-form-calendar .react-calendar__navigation button:hover {
            background: rgba(99,102,241,0.12) !important;
          }
          .leave-form-calendar .react-calendar__navigation__label {
            flex-grow: 1 !important;
            font-size: 13px !important;
            font-weight: 900 !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
          }

          /* ── Weekday header row ── */
          .leave-form-calendar .react-calendar__month-view__weekdays {
            text-align: center !important;
            margin-bottom: 4px !important;
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
          }
          .leave-form-calendar .react-calendar__month-view__weekdays__weekday {
            padding: 4px 0 !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            color: #94a3b8 !important;
            flex: 1 !important;
            text-align: center !important;
          }
          .leave-form-calendar .react-calendar__month-view__weekdays__weekday abbr {
            text-decoration: none !important;
          }

          /* ── Month view: strict 7-col grid, no overflow ── */
          .leave-form-calendar .react-calendar__month-view {
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .leave-form-calendar .react-calendar__month-view__days {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 3px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* ── Base tile ── */
          .leave-form-calendar .react-calendar__tile {
            position: relative !important;
            width: 100% !important;
            aspect-ratio: 1 / 1 !important;
            min-width: 0 !important;
            max-width: 100% !important;
            min-height: 40px !important;
            box-sizing: border-box !important;
            border-radius: 8px !important;
            border: 1.5px solid rgba(148,163,184,0.15) !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            padding: 0 !important;
            cursor: pointer !important;
            transition: background 0.15s, border-color 0.15s !important;
            overflow: hidden !important;
            flex: unset !important;
          }

          /* ── Regular date number ── */
          .leave-form-calendar .react-calendar__tile abbr {
            display: block !important;
            line-height: 1.2 !important;
            font-size: 11px !important;
            position: relative !important;
            z-index: 1 !important;
          }

          /* ── Current/future date colors (light) ── */
          .leave-form-calendar .react-calendar__tile:not(.react-calendar__tile--neighboringMonth) {
            color: #1e293b !important;
          }
          .dark .leave-form-calendar .react-calendar__tile:not(.react-calendar__tile--neighboringMonth) {
            color: #f1f5f9 !important;
          }

          /* ── Past dates ── */
          .leave-form-calendar .react-calendar__tile--past:not(.react-calendar__tile--neighboringMonth) {
            color: #cbd5e1 !important;
            cursor: not-allowed !important;
            border-color: transparent !important;
            background: transparent !important;
            pointer-events: none !important;
            opacity: 1 !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--past:not(.react-calendar__tile--neighboringMonth) {
            color: #334155 !important;
          }
          .leave-form-calendar .react-calendar__tile--past abbr {
            color: #cbd5e1 !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--past abbr {
            color: #334155 !important;
          }

          /* ── Neighboring month tiles ── */
          .leave-form-calendar .react-calendar__tile--neighboringMonth {
            background: transparent !important;
            border-color: transparent !important;
            color: transparent !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }

          /* ── Today tile (not selected) ── */
          .leave-form-calendar .react-calendar__tile--now:not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(99,102,241,0.1) !important;
            border-color: #6366f1 !important;
            color: #6366f1 !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--now:not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(99,102,241,0.18) !important;
          }

          /* ── Selected / active tile ── */
          .leave-form-calendar .react-calendar__tile--active,
          .leave-form-calendar .react-calendar__tile--rangeStart,
          .leave-form-calendar .react-calendar__tile--rangeEnd {
            background: #4f46e5 !important;
            color: white !important;
            border-color: #4f46e5 !important;
            border-radius: 8px !important;
          }
          .leave-form-calendar .react-calendar__tile--active abbr,
          .leave-form-calendar .react-calendar__tile--rangeStart abbr,
          .leave-form-calendar .react-calendar__tile--rangeEnd abbr {
            color: white !important;
          }

          /* ── Range middle tiles ── */
          .leave-form-calendar .react-calendar__tile--range:not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: #e0e7ff !important;
            color: #4338ca !important;
            border-radius: 0 !important;
            border-color: transparent !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--range:not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: #312e81 !important;
            color: #e0e7ff !important;
          }
          .leave-form-calendar .react-calendar__tile--rangeStart {
            border-top-left-radius: 8px !important;
            border-bottom-left-radius: 8px !important;
            border-top-right-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
          }
          .leave-form-calendar .react-calendar__tile--rangeEnd {
            border-top-right-radius: 8px !important;
            border-bottom-right-radius: 8px !important;
            border-top-left-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
          }
          .leave-form-calendar .react-calendar__tile--rangeStart.react-calendar__tile--rangeEnd {
            border-radius: 8px !important;
          }

          /* ── Fixed holiday tile ── */
          .leave-form-calendar .tile-holiday-fixed:not(.react-calendar__tile--past):not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(148,163,184,0.08) !important;
            border-color: rgba(148,163,184,0.3) !important;
          }
          .dark .leave-form-calendar .tile-holiday-fixed:not(.react-calendar__tile--past):not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(100,116,139,0.12) !important;
          }

          /* ── Optional holiday tile — dotted blue ── */
          .leave-form-calendar .tile-holiday-optional:not(.react-calendar__tile--past):not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(59,130,246,0.06) !important;
            border-color: #3b82f6 !important;
            border-style: dashed !important;
          }
          .dark .leave-form-calendar .tile-holiday-optional:not(.react-calendar__tile--past):not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(59,130,246,0.1) !important;
            border-color: #60a5fa !important;
            border-style: dashed !important;
          }

          /* ── Optional holiday tile — used (red dotted) ── */
          .leave-form-calendar .tile-holiday-optional-used:not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(239,68,68,0.07) !important;
            border-color: #ef4444 !important;
            border-style: dashed !important;
          }
          .dark .leave-form-calendar .tile-holiday-optional-used:not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(239,68,68,0.12) !important;
            border-color: #f87171 !important;
            border-style: dashed !important;
          }
          .leave-form-calendar .tile-holiday-optional-used abbr {
            display: none !important;
          }
          .leave-form-calendar .tile-holiday-optional-used .holiday-badge {
            color: #ef4444 !important;
          }
          .dark .leave-form-calendar .tile-holiday-optional-used .holiday-badge {
            color: #f87171 !important;
          }
          .leave-form-calendar .react-calendar__tile--past.tile-holiday-optional-used .holiday-badge {
            color: #fca5a5 !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--past.tile-holiday-optional-used .holiday-badge {
            color: #7f1d1d !important;
          }

          /* ── Existing leave tile — red tint ── */
          .leave-form-calendar .tile-has-leave:not(.react-calendar__tile--past):not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(239,68,68,0.08) !important;
            border-color: rgba(239,68,68,0.4) !important;
          }
          .dark .leave-form-calendar .tile-has-leave:not(.react-calendar__tile--past):not(.react-calendar__tile--active):not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) {
            background: rgba(239,68,68,0.12) !important;
            border-color: rgba(239,68,68,0.45) !important;
          }
          .leave-form-calendar .tile-has-leave abbr {
            color: #ef4444 !important;
          }
          .dark .leave-form-calendar .tile-has-leave abbr {
            color: #f87171 !important;
          }
          .leave-form-calendar .react-calendar__tile--past.tile-has-leave abbr {
            color: #fca5a5 !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--past.tile-has-leave abbr {
            color: #7f1d1d !important;
          }

          /* ── Hide date number on holiday tiles ── */
          .leave-form-calendar .tile-holiday-fixed abbr,
          .leave-form-calendar .tile-holiday-optional abbr {
            display: none !important;
          }

          /* ── Holiday badge ── */
          .leave-form-calendar .react-calendar__tile .holiday-badge {
            position: absolute !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 9px !important;
            font-weight: 900 !important;
            line-height: 1 !important;
            letter-spacing: 0.04em !important;
            pointer-events: none !important;
            z-index: 2 !important;
          }
          .leave-form-calendar .tile-holiday-fixed .holiday-badge { color: #94a3b8 !important; }
          .leave-form-calendar .tile-holiday-optional .holiday-badge { color: #3b82f6 !important; }
          .dark .leave-form-calendar .tile-holiday-optional .holiday-badge { color: #60a5fa !important; }
          .leave-form-calendar .react-calendar__tile--active .holiday-badge,
          .leave-form-calendar .react-calendar__tile--rangeStart .holiday-badge,
          .leave-form-calendar .react-calendar__tile--rangeEnd .holiday-badge {
            color: rgba(255,255,255,0.95) !important;
          }
          .leave-form-calendar .react-calendar__tile--range:not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) .holiday-badge {
            color: #4338ca !important;
          }
          .dark .leave-form-calendar .react-calendar__tile--range:not(.react-calendar__tile--rangeStart):not(.react-calendar__tile--rangeEnd) .holiday-badge {
            color: #c7d2fe !important;
          }
          .leave-form-calendar .react-calendar__tile--past .holiday-badge { color: #cbd5e1 !important; }
          .dark .leave-form-calendar .react-calendar__tile--past .holiday-badge { color: #334155 !important; }

          /* ── CSS-only holiday name tooltip — desktop only ── */
          /* Tile keeps overflow:hidden — tooltip rendered via JS portal instead */
          .leave-form-calendar .react-calendar__tile .holiday-name-tooltip {
            display: none !important;
          }
          .leave-form-calendar-tooltip {
            position: fixed;
            background: #1e293b;
            color: #f1f5f9;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 700;
            max-width: 160px;
            text-align: center;
            line-height: 1.4;
            pointer-events: none;
            z-index: 9999;
            box-shadow: 0 4px 16px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            white-space: normal;
            transform: translateX(-50%) translateY(-100%);
            margin-top: -8px;
          }
          .leave-form-calendar-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: #1e293b;
          }

          /* ── xs (< 375px) ── */
          @media (max-width: 374px) {
            .leave-form-calendar .react-calendar__tile {
              font-size: 9px !important;
              min-height: 34px !important;
              border-radius: 5px !important;
            }
            .leave-form-calendar .react-calendar__tile abbr { font-size: 9px !important; }
            .leave-form-calendar .react-calendar__tile .holiday-badge { font-size: 7px !important; }
            .leave-form-calendar .react-calendar__navigation button { font-size: 11px !important; min-width: 28px !important; }
            .leave-form-calendar .react-calendar__navigation__label { font-size: 11px !important; }
            .leave-form-calendar .react-calendar__month-view__days { gap: 1px !important; }
          }

          /* ── sm (375–639px) ── */
          @media (min-width: 375px) and (max-width: 639px) {
            .leave-form-calendar .react-calendar__tile {
              font-size: 10px !important;
              min-height: 38px !important;
              border-radius: 6px !important;
            }
            .leave-form-calendar .react-calendar__tile abbr { font-size: 10px !important; }
            .leave-form-calendar .react-calendar__tile .holiday-badge { font-size: 8px !important; }
            .leave-form-calendar .react-calendar__month-view__days { gap: 2px !important; }
          }

          /* ── Range start/end radius on mobile ── */
          @media (max-width: 639px) {
            .leave-form-calendar .react-calendar__tile--active,
            .leave-form-calendar .react-calendar__tile--rangeStart.react-calendar__tile--rangeEnd {
              border-radius: 6px !important;
            }
            .leave-form-calendar .react-calendar__tile--rangeStart {
              border-top-left-radius: 6px !important;
              border-bottom-left-radius: 6px !important;
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
            }
            .leave-form-calendar .react-calendar__tile--rangeEnd {
              border-top-right-radius: 6px !important;
              border-bottom-right-radius: 6px !important;
              border-top-left-radius: 0 !important;
              border-bottom-left-radius: 0 !important;
            }
          }
        `}</style>


        {/* Fixed-position holiday name tooltip — desktop hover only */}
        {hoveredTooltip && (
          <div
            className="leave-form-calendar-tooltip hidden sm:block"
            style={{ left: hoveredTooltip.x, top: hoveredTooltip.y }}
          >
            {hoveredTooltip.name}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-[2.5rem] overflow-hidden shadow-sm min-h-screen sm:min-h-0">

          {/* ── Header ── */}
          <div className="px-4 sm:px-8 py-5 sm:py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-10 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-none flex-shrink-0">
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-sm sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Leave Request</h2>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Specify your time-off requirements</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-4 sm:p-8 space-y-6 sm:space-y-10">

            {/* ── Calendar Section ── */}
            <section className="bg-slate-50 dark:bg-slate-800/30 p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4 sm:mb-6 text-indigo-600 dark:text-indigo-400">
                <CalendarIcon size={15} />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Select Leave Dates</span>
              </div>
              <Calendar
                onChange={handleCalendarChange}
                selectRange={false}
                value={
                  formData.startDate
                    ? (formData.endDate && formData.endDate !== formData.startDate
                        ? [stringToDate(formData.startDate)!, stringToDate(formData.endDate)!]
                        : stringToDate(formData.startDate))
                    : null
                }
                className="leave-form-calendar"
                tileClassName={({ date }) => {
                  const key = dateToString(date);
                  const holiday = getHoliday(key);
                  if (holiday?.type === 'FIXED') return 'tile-holiday-fixed';
                  if (holiday?.type === 'OPTIONAL') {
                    return leaveDates.has(key) ? 'tile-holiday-optional-used' : 'tile-holiday-optional';
                  }
                  if (leaveDates.has(key)) return 'tile-has-leave';
                  return '';
                }}
                tileContent={({ date }) => {
                  const key = dateToString(date);
                  const holiday = getHoliday(key);
                  if (!holiday) return null;
                  const label = holiday.type === 'FIXED' ? 'H' : 'OH';
                  return (
                    <span
                      className="holiday-badge"
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).closest('button')?.getBoundingClientRect();
                        if (rect) setHoveredTooltip({ name: holiday.name, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      {label}
                    </span>
                  );
                }}
                onClickDay={(date) => handleDayClick(date)}
              />

              {/* Legend + stage hint */}
              <div className="mt-3 flex flex-col items-center gap-2">
                <div className="flex gap-3 justify-center flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Fixed (H)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" style={{outline: '1.5px dashed #3b82f6', outlineOffset: '1px'}}></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Optional (OH)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" style={{outline: '1.5px dashed #ef4444', outlineOffset: '1px'}}></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">OH Used</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">On Leave</span>
                  </div>
                </div>

                {/* Mobile holiday name banner — shown on tap, auto-dismisses */}
                {tappedHolidayName && (
                  <div className="sm:hidden w-full mt-1 px-3 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-center animate-in fade-in slide-in-from-top-1 duration-150">
                    <span className="text-[11px] font-black text-white tracking-wide">{tappedHolidayName}</span>
                  </div>
                )}

                {!['HALF', 'EARLY', 'LATE'].includes(formData.type) && (
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    {clickStage === 'start' ? '1st click sets start date' : '2nd click sets end date'}
                  </p>
                )}
              </div>
            </section>

            {/* ── Blocked: existing leave on this date ── */}
            {blockedLeaveDate && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2 duration-200">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-600 dark:text-red-400 mb-0.5">Leave Already Applied</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    You already have an approved or pending leave on <span className="font-black">{new Date(blockedLeaveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>. Please select a different date.
                  </p>
                </div>
              </div>
            )}

            {/* ── Blocked: single fixed holiday ── */}
            {blockedHoliday && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 animate-in slide-in-from-top-2 duration-200">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-red-600 dark:text-red-400 mb-0.5">Leave Not Applicable</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    <span className="font-black">{blockedHoliday}</span> is a company-wide fixed holiday. Leave cannot be applied on this date.
                  </p>
                </div>
              </div>
            )}

            {/* ── Info: fixed holidays in range ── */}
            {fixedHolidaysInRange.length > 0 && !blockedHoliday && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-2 duration-200">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                    {fixedHolidaysInRange.length === 1 && fixedHolidaysInRange[0].isHalfDay
                      ? 'Half-Day Company Holiday'
                      : 'Company Holiday' + (fixedHolidaysInRange.length > 1 ? 's in Range' : '')}
                  </p>
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-2 leading-relaxed">
                    {fixedHolidaysInRange.length === 1
                      ? fixedHolidaysInRange[0].isHalfDay
                        ? `${fixedHolidaysInRange[0].name} falls on this date. It's a company half-day — only the other half can be taken as leave.`
                        : `${fixedHolidaysInRange[0].name} falls within your selected dates. This is already a paid company holiday, so no leave will be deducted for this day.`
                      : `Your selected range includes ${fixedHolidaysInRange.length} company holidays (listed below). You won't need to use your leave balance for these days — they are already paid holidays.`
                    }
                  </p>
                  <div className="flex flex-col gap-1">
                    {fixedHolidaysInRange.map(h => (
                      <div key={h.date} className="flex items-center gap-2 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                          {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} — {h.name}{h.isHalfDay ? ' (Half Day)' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Info: optional holiday clicked ── */}
            {clickedOptionalHoliday && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 animate-in slide-in-from-top-2 duration-200">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">Optional Holiday</p>
                  <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-2 leading-relaxed">
                    <span className="font-black">{clickedOptionalHoliday.name}</span> is an optional holiday. You can choose to apply your optional holiday quota for this date — it won't count against your regular leave balance.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                      {new Date(clickedOptionalHoliday.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} — {clickedOptionalHoliday.name} (Optional)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Category ── */}
            <section>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block">Category</label>
              <div className="relative group">
                <select
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value as any)}
                  className={inputBase}
                >
                  <option value="FULL">Full Day</option>
                  <option value="HALF">Half Day</option>
                  <option value="EARLY">Early Leave</option>
                  <option value="LATE">Late Coming</option>
                  <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ChevronDown size={20} />
                </div>
              </div>
            </section>

            {/* ── Date display ── */}
            <section className="flex flex-col sm:flex-row gap-3 sm:gap-6 w-full">
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Start Date</label>
                <div className={`${inputBase} flex items-center justify-between cursor-default`}>
                  <span className={`truncate ${formData.startDate ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 font-normal'}`}>
                    {formData.startDate
                      ? new Date(formData.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                      : 'Not selected'}
                  </span>
                  <CalendarIcon className="text-slate-400 w-5 h-5 flex-shrink-0 ml-2" />
                </div>
              </div>
              {!['HALF', 'EARLY', 'LATE'].includes(formData.type) && (
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">End Date</label>
                  <div className={`${inputBase} flex items-center justify-between cursor-default`}>
                    <span className={`truncate ${formData.endDate ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 font-normal'}`}>
                      {formData.endDate
                        ? new Date(formData.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                        : 'Not selected'}
                    </span>
                    <CalendarIcon className="text-slate-400 w-5 h-5 flex-shrink-0 ml-2" />
                  </div>
                </div>
              )}
            </section>

            {/* ── Time section ── */}
            {['HALF', 'EARLY', 'LATE'].includes(formData.type) && (
              <section className="p-4 sm:p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 mb-5 sm:mb-6 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest">
                  <Clock size={16} />
                  <span>Applying For</span>
                </div>

                {formData.type === 'HALF' ? (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Slot buttons: stack on very small screens, 3-col on sm+ */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {[
                        { id: 'FIRST_HALF', label: '1st Half', time: '10:00 - 02:30' },
                        { id: 'SECOND_HALF', label: '2nd Half', time: '02:30 - 07:00' },
                        { id: 'CUSTOM', label: 'Custom', time: 'Manual entry' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSlotChange(s.id as any)}
                          className={`flex flex-col items-center py-3 sm:py-4 rounded-2xl border-2 transition-all ${
                            formData.slot === s.id
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300'
                              : 'border-transparent bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="text-[10px] sm:text-sm font-black uppercase mb-1 text-center leading-tight">{s.label}</span>
                          <span className="text-[8px] sm:text-[10px] font-bold opacity-80 text-center leading-tight">{s.time}</span>
                        </button>
                      ))}
                    </div>
                    {formData.slot === 'CUSTOM' && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-in slide-in-from-top-2">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">Start Time</span>
                          <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
                            className={inputBase}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">End Time</span>
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
                            className={inputBase}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                      {formData.type === 'EARLY' ? 'Estimated Leaving time' : 'Estimated Arrival time'}
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
                      className={inputBase}
                    />
                  </div>
                )}
              </section>
            )}

            {/* ── Optional holiday banner ── */}
            {formData.type === 'FULL' && detectedOptionalHolidays.length === 1 && !hasUsedApprovedOptional && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 animate-in slide-in-from-top-2 duration-200">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">Optional Holiday Available</p>
                  <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-2 leading-relaxed">
                    <span className="font-black">{detectedOptionalHolidays[0].name}</span> falls on your selected date. This is an optional holiday — you can use your optional quota instead of your regular leave balance.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                      {new Date(formData.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} — {detectedOptionalHolidays[0].name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOptionalLeave(!isOptionalLeave)}
                      className={`ml-auto flex-shrink-0 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border ${
                        isOptionalLeave
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700'
                      }`}
                    >
                      {isOptionalLeave ? '✓ Applied' : 'Apply Quota'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Reason ── */}
            <section>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 block">Justification</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className={`${inputBase} min-h-[120px] sm:min-h-[140px] resize-none pt-5 italic leading-relaxed`}
                placeholder="Please provide a brief reason for your leave request..."
              />
            </section>

            {/* ── Action buttons ── */}
            <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 pb-safe">
              <button
                onClick={onCancel}
                className="px-3 sm:px-8 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-200 transition-colors flex-shrink-0 min-w-[64px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-4 sm:py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-none dark:shadow-none disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Submit Application'}
                {!isSubmitting && <ChevronRight className="w-4 h-4 flex-shrink-0" />}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};