"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronRight, Briefcase, Sparkles, X, ChevronDown, Calendar } from 'lucide-react';
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
    setIsOptionalLeave(false);
  }, [formData.startDate, formData.endDate]);

  const handleTypeChange = (type: LeaveFormData['type']): void => {
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

    setIsSubmitting(true);
    try {
      const submitData = {
        ...finalData,
        isOptional: isOptionalLeave && !hasUsedApprovedOptional,
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
    <div className="max-w-3xl mx-auto p-4 sm:p-0">
      <style jsx global>{`
        /* Kill blue highlight on mobile/chrome */
        * { -webkit-tap-highlight-color: transparent !important; }
        .dark input:-webkit-autofill {
          -webkit-text-fill-color: #f1f5f9;
          -webkit-box-shadow: 0 0 0px 1000px #1e293b inset;
        }
        .react-datepicker-wrapper { width: 100%; }
        /* Prevent default focus ring overlay */
        button:focus, select:focus, input:focus { outline: none !important; }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-none">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight uppercase">Leave Request</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Specify your time-off requirements</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-10">
          <section>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block">Category</label>
            <div className="relative group">
              <select value={formData.type} onChange={(e) => handleTypeChange(e.target.value as any)} className={inputBase}>
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

          <section className="flex flex-col sm:flex-row gap-6 w-full">
            <div className="flex-1 relative">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Start Date</label>
              <DatePicker
                selected={stringToDate(formData.startDate)}
                onChange={(date) => setFormData(prev => ({ ...prev, startDate: dateToString(date), endDate: ['HALF', 'EARLY', 'LATE'].includes(prev.type) ? dateToString(date) : prev.endDate }))}
                className={inputBase}
                placeholderText="Select start date"
                dateFormat="MMM dd, yyyy"
                minDate={new Date()}
              />
              <Calendar className="absolute right-4 top-[48px] text-slate-400 w-5 h-5 pointer-events-none" />
            </div>
            {!['HALF', 'EARLY', 'LATE'].includes(formData.type) && (
              <div className="flex-1 relative">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">End Date</label>
                <DatePicker
                  selected={stringToDate(formData.endDate)}
                  onChange={(date) => setFormData(prev => ({ ...prev, endDate: dateToString(date) }))}
                  className={inputBase}
                  placeholderText="Select end date"
                  dateFormat="MMM dd, yyyy"
                  minDate={stringToDate(formData.startDate) || new Date()}
                  disabled={!formData.startDate}
                />
                <Calendar className="absolute right-4 top-[48px] text-slate-400 w-5 h-5 pointer-events-none" />
              </div>
            )}
          </section>

          {['HALF', 'EARLY', 'LATE'].includes(formData.type) && (
            <section className="p-8 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3 mb-6 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest">
                <Clock size={18} />
                <span>Applying For</span>
              </div>
              
              {formData.type === 'HALF' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'FIRST_HALF', label: '1st Half', time: '10:00 - 02:30' },
                      { id: 'SECOND_HALF', label: '2nd Half', time: '02:30 - 07:00' },
                      { id: 'CUSTOM', label: 'Custom', time: 'Manual entry' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSlotChange(s.id as any)}
                        // ✅ FIX: Removed bg-white from dark mode active state
                        className={`flex flex-col items-center py-4 rounded-2xl border-2 transition-all ${
                          formData.slot === s.id 
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300' 
                          : 'border-transparent bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-sm font-black uppercase mb-1">{s.label}</span>
                        <span className="text-[10px] font-bold opacity-80">{s.time}</span>
                      </button>
                    ))}
                  </div>
                  {formData.slot === 'CUSTOM' && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="space-y-1 flex-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">Start Time</span>
                        <input type="time" value={formData.startTime} onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))} className={inputBase} />
                      </div>
                      <div className="space-y-1 flex-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase ml-2">End Time</span>
                        <input type="time" value={formData.endTime} onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))} className={inputBase} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">
                    {formData.type === 'EARLY' ? 'Estimated Leaving time' : 'Estimated Arrival time'}
                  </label>
                  <input type="time" value={formData.startTime} onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))} className={inputBase} />
                </div>
              )}
            </section>
          )}

          {detectedOptionalHolidays.length === 1 && !hasUsedApprovedOptional && (
            <div className="p-6 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 flex flex-col sm:flex-row gap-4 items-center animate-in slide-in-from-bottom-2">
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Optional Holiday Recognized</span>
                </div>
                <p className="text-base font-black text-slate-800 dark:text-slate-100">{detectedOptionalHolidays[0].name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOptionalLeave(!isOptionalLeave)}
                className={`px-8 py-3 rounded-full text-[11px] font-black uppercase transition-all ${
                  isOptionalLeave 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700'
                }`}
              >
                {isOptionalLeave ? '✓ Holiday Applied' : 'Use Holiday Quota'}
              </button>
            </div>
          )}

          <section>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 block">Justification</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className={`${inputBase} min-h-[140px] resize-none pt-5 italic leading-relaxed`}
              placeholder="Please provide a brief reason for your leave request..."
            />
          </section>

          <div className="flex items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button onClick={onCancel} className="px-8 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 shadow-none dark:shadow-none disabled:opacity-50"
            >
              {isSubmitting ? 'Processing Submission...' : 'Submit Application'}
              {!isSubmitting && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};