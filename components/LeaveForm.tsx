"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronRight, Briefcase, Sparkles, X} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { LeaveFormData } from '@/type/form';
import { toast } from 'react-toastify';
import { getHoliday, findOptionalInStates } from '@/lib/holidays';

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

  // ✅ FIX 1: Robust Quota Check
  const hasUsedApprovedOptional = useMemo(() => {
    if (!existingLeaves || !Array.isArray(existingLeaves)) return false;
    const currentYear = new Date().getFullYear();

    return existingLeaves.some(l => {
      const rawDate = l.startDate ? String(l.startDate).slice(0, 10) : null;
      if (!rawDate) return false;
      const [y] = rawDate.split('-').map(Number);
      const isThisYear = y === currentYear;

      const isApproved =
        l.status?.toUpperCase() === 'APPROVED' ||
        l.status?.toUpperCase() === 'PENDING';

      if (!isThisYear || !isApproved) return false;

      const isOptional =
        l.isOptional === true ||
        l.type === 'OPTIONAL' ||
        (typeof l.holidayName === 'string' && l.holidayName.trim() !== '') ||
        (typeof l.reason === 'string' && l.reason.includes('[OPTIONAL HOLIDAY:'));

      return isOptional;
    });
  }, [existingLeaves]);

  // ✅ FIX 2: Timezone-Safe Local Date Parsing
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
  }, [startHoliday, formData.type]);

  useEffect(() => {
    setIsOptionalLeave(false);
  }, [formData.startDate, formData.endDate]);

  const handleTypeChange = (type: LeaveFormData['type']): void => {
    setFormData(prev => ({
      ...prev,
      type,
      endDate: ['HALF', 'EARLY', 'LATE'].includes(type) ? prev.startDate : prev.endDate,
      startTime: '',
      endTime: '',
      slot: ''
    }));
  };

  const handleSlotChange = (slot: NonNullable<LeaveFormData['slot']>) => {
    const times: Record<string, { start: string; end: string }> = {
      FIRST_HALF: { start: '10:00', end: '14:00' },
      SECOND_HALF: { start: '14:00', end: '19:00' },
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

    setIsSubmitting(true);
    try {
      const submitData = {
        ...finalData,
        // Keep the isOptional flag and holidayName for database tracking
        isOptional: isOptionalLeave && !hasUsedApprovedOptional,
        holidayName: isOptionalLeave && detectedOptionalHolidays.length === 1
          ? detectedOptionalHolidays[0].name
          : null,
        // ✅ CHANGED: Just send the raw reason without the holiday prefix
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

  const inputBase = "w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none";

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-0">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Leave Request</h2>
              <p className="text-xs text-slate-500">Apply for time off or remote work</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {startHoliday?.isHalfDay && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight">{startHoliday.name} (Half Day)</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-500 font-medium">This date is a half-day holiday. Please select which half you wish to take leave for.</p>
              </div>
            </div>
          )}

          <section>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl">
              {['FULL', 'HALF', 'EARLY', 'LATE', 'WORK_FROM_HOME'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t as any)}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    formData.type === t 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block">From</label>
              <DatePicker
                selected={stringToDate(formData.startDate)}
                onChange={(date) => setFormData(prev => ({ ...prev, startDate: dateToString(date), endDate: ['HALF', 'EARLY', 'LATE'].includes(prev.type) ? dateToString(date) : prev.endDate }))}
                className={inputBase}
                dateFormat="MMM dd, yyyy"
                minDate={new Date()}
              />
            </div>
            {!['HALF', 'EARLY', 'LATE'].includes(formData.type) && (
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block">To</label>
                <DatePicker
                  selected={stringToDate(formData.endDate)}
                  onChange={(date) => setFormData(prev => ({ ...prev, endDate: dateToString(date) }))}
                  className={inputBase}
                  dateFormat="MMM dd, yyyy"
                  minDate={stringToDate(formData.startDate) || new Date()}
                  disabled={!formData.startDate}
                />
              </div>
            )}
          </section>

          {detectedOptionalHolidays.length === 1 && !hasUsedApprovedOptional && (
            <div className={`p-5 rounded-[2rem] border flex flex-col sm:flex-row gap-4 items-center bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 animate-in zoom-in-95 transition-all`}>
              <div className="flex-1 text-center sm:text-left">
                <div className={`flex items-center gap-2 mb-1 justify-center sm:justify-start text-indigo-600`}>
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">Optional Holiday Detected</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{detectedOptionalHolidays[0].name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOptionalLeave(!isOptionalLeave)}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${
                  isOptionalLeave ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                {isOptionalLeave ? '✓ Holiday Selected' : 'Use Optional Leave'}
              </button>
            </div>
          )}

          {formData.type === 'HALF' && (
            <section className="animate-in fade-in zoom-in-95">
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block">Shift Selection</label>
              <div className="grid grid-cols-2 gap-3">
                {['FIRST_HALF', 'SECOND_HALF'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSlotChange(s as any)}
                    className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all ${
                      formData.slot === s ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 dark:border-slate-800'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-2 block">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className={`${inputBase} min-h-[120px] resize-none pt-4`}
              placeholder="Provide a brief explanation..."
            />
          </section>

          <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={onCancel} className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
            >
              {isSubmitting ? 'Processing...' : 'Submit Request'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};