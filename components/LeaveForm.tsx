"use client";

import React, { useState } from 'react';
import { Calendar, Clock, FileText, ChevronRight, Briefcase, Info } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { LeaveFormData } from '@/type/form';
import { toast } from 'react-toastify';

interface LeaveFormProps {
  onSubmit: (formData: LeaveFormData) => Promise<void>;
  onCancel: () => void;
}

export const LeaveForm: React.FC<LeaveFormProps> = ({ onSubmit, onCancel }) => {
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

  const stringToDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const dateToString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleTypeChange = (type: LeaveFormData['type']): void => {
    setFormData({
      ...formData,
      type,
      endDate: (type === 'HALF' || type === 'EARLY' || type === 'LATE') ? formData.startDate : formData.endDate,
      startTime: '',
      endTime: '',
      slot: ''
    });
  };

  const handleSlotChange = (slot: NonNullable<LeaveFormData['slot']>) => {
    const times: Record<string, { start: string; end: string }> = {
      FIRST_HALF: { start: '10:00', end: '14:00' },
      SECOND_HALF: { start: '14:00', end: '19:00' },
      CUSTOM: { start: '', end: '' }
    };
    const selectedTimes = times[slot] || { start: '', end: '' };
    setFormData({ 
      ...formData, 
      slot, 
      startTime: selectedTimes.start, 
      endTime: selectedTimes.end 
    });
  };

  const handleSubmit = async (): Promise<void> => {
    const isSingleDay = ['HALF', 'EARLY', 'LATE'].includes(formData.type);
    const finalData: LeaveFormData = { 
      ...formData, 
      endDate: isSingleDay ? formData.startDate : formData.endDate 
    };

    if (!finalData.startDate || (!isSingleDay && !finalData.endDate) || !finalData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = { ...finalData };
      if ('slot' in submitData) {
        delete (submitData as { slot?: string }).slot;
      }

      await onSubmit(submitData as LeaveFormData);
      toast.success('Leave request submitted!');
      
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
        type: 'FULL',
        startTime: '',
        endTime: '',
        slot: ''
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit request';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none dark:text-white placeholder:text-gray-400";
  const sectionTitleClasses = "flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400 mb-4";
  const sectionWrapperClasses = "p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800/60 shadow-sm";

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 overflow-hidden transition-all">
      
      <div className="px-8 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight italic uppercase">New Request</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Complete the details for your Leave</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-300 dark:text-slate-700">
          <Info className="w-5 h-5" />
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        
        <section className={sectionWrapperClasses}>
          <h4 className={sectionTitleClasses}>
            <Info className="w-3.5 h-3.5" /> Leave Category
          </h4>
          <div className="space-y-1">
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value as LeaveFormData['type'])}
              className={inputClasses}
            >
              <option value="FULL">Full Day Leave</option>
              <option value="HALF">Half Day Leave</option>
              <option value="EARLY">Early Leave</option>
              <option value="LATE">Late Coming</option>
              <option value="WORK_FROM_HOME">Work From Home</option>
            </select>
          </div>
        </section>

        <section className={sectionWrapperClasses}>
          <h4 className={sectionTitleClasses}>
            <Calendar className="w-3.5 h-3.5" /> Schedule & Dates
          </h4>
          <div className={`grid gap-4 ${formData.type === 'HALF' || formData.type === 'EARLY' || formData.type === 'LATE' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block tracking-widest uppercase">Date</label>
              <DatePicker
                selected={stringToDate(formData.startDate)}
                onChange={(date) => setFormData({ ...formData, startDate: dateToString(date), endDate: (formData.type === 'HALF' || formData.type === 'EARLY' || formData.type === 'LATE') ? dateToString(date) : formData.endDate })}
                className={inputClasses}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
                minDate={new Date()}
              />
            </div>
            {!(formData.type === 'HALF' || formData.type === 'EARLY' || formData.type === 'LATE') && (
              <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block tracking-widest uppercase">End Date</label>
                <DatePicker
                  selected={stringToDate(formData.endDate)}
                  onChange={(date) => setFormData({ ...formData, endDate: dateToString(date) })}
                  minDate={stringToDate(formData.startDate) || new Date()} 
                  disabled={!formData.startDate}
                  className={inputClasses}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select end date"
                />
              </div>
            )}
          </div>

          {formData.type === 'HALF' && (
            <div className="mt-6 space-y-3 animate-in zoom-in-95 duration-200">
              <label className="text-[10px] font-bold text-slate-400 ml-1 block tracking-widest uppercase">Shift Selection</label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                {[
                  { id: 'FIRST_HALF', label: '10am - 2pm', sub: '1st Half' },
                  { id: 'SECOND_HALF', label: '2pm - 7pm', sub: '2nd Half' },
                  { id: 'CUSTOM', label: 'Custom', sub: 'Set Time' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSlotChange(s.id as NonNullable<LeaveFormData['slot']>)}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-300 ${
                      formData.slot === s.id 
                      ? 'bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none text-white' 
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tight">{s.label}</span>
                    <span className={`text-[8px] font-bold ${formData.slot === s.id ? 'opacity-70' : 'opacity-40'}`}>{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* --- SECTION 3: TIMINGS (UPDATED FOR EARLY/LATE) --- */}
        {(formData.slot === 'CUSTOM' || ['EARLY', 'LATE'].includes(formData.type)) && (
          <section className={`${sectionWrapperClasses} border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-500/5 animate-in slide-in-from-top-4 duration-500`}>
            <h4 className={`${sectionTitleClasses} text-indigo-700 dark:text-indigo-300`}>
              <Clock className="w-3.5 h-3.5" /> Timing Details
            </h4>
            <div className={`grid gap-4 ${formData.type === 'EARLY' || formData.type === 'LATE' ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {(formData.slot === 'CUSTOM' || formData.type === 'LATE') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 ml-1 mb-1 block tracking-widest uppercase">
                    {formData.type === 'LATE' ? 'Expected Arrival Time' : 'Start Time'}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-3.5 w-4 h-4 text-indigo-300" />
                    <input 
                      type="time" 
                      value={formData.startTime} 
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} 
                      className={`${inputClasses} pl-11 border-indigo-100 dark:border-indigo-900/50`} 
                    />
                  </div>
                </div>
              )}
              {(formData.slot === 'CUSTOM' || formData.type === 'EARLY') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-400 ml-1 mb-1 block tracking-widest uppercase">
                    {formData.type === 'EARLY' ? 'Expected Departure Time' : 'End Time'}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-3.5 w-4 h-4 text-indigo-300" />
                    <input 
                      type="time" 
                      value={formData.endTime} 
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} 
                      className={`${inputClasses} pl-11 border-indigo-100 dark:border-indigo-900/50`} 
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <section className={sectionWrapperClasses}>
          <h4 className={sectionTitleClasses}>
            <FileText className="w-3.5 h-3.5" /> Justification
          </h4>
          <div className="relative">
            <FileText className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className={`${inputClasses} min-h-[140px] pl-12 pt-4 resize-none`}
              placeholder="Provide a brief reason for your request..."
            />
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row gap-4 pt-4">
          <button
            onClick={onCancel}
            type="button"
            className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-all text-center"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[2] bg-slate-950 dark:bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-2xl shadow-indigo-200 dark:shadow-none disabled:opacity-70"
          >
            {isSubmitting ? 'Processing...' : 'Submit Request'}
            {!isSubmitting && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};