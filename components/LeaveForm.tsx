import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
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
    endTime: ''
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

  const handleSubmit = async (): Promise<void> => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast('Please fill in all required fields');
      return;
    }

    if (['HALF', 'EARLY', 'LATE'].includes(formData.type) && !formData.startTime) {
      toast('Please select time for this leave type');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ 
        startDate: '', 
        endDate: '', 
        reason: '', 
        type: 'FULL',
        startTime: '',
        endTime: ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDateChange = (date: Date | null): void => {
    setFormData({ 
      ...formData, 
      startDate: dateToString(date), 
      endDate: '' 
    });
  };

  const handleEndDateChange = (date: Date | null): void => {
    setFormData({ 
      ...formData, 
      endDate: dateToString(date) 
    });
  };

  const handleTypeChange = (type: LeaveFormData['type']): void => {
    setFormData({
      ...formData,
      type,
      startTime: '',
      endTime: ''
    });
  };

  const showTimeFields = ['HALF', 'EARLY', 'LATE'].includes(formData.type);
  const showEndTime = formData.type === 'HALF';

  // Common input styles for theme sync
  const inputClasses = "w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-900 dark:text-white transition-colors outline-none";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-slate-800 transition-colors duration-300">
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-tight">New Leave Request</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DatePicker
                selected={stringToDate(formData.startDate)}
                onChange={handleStartDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                disabled={isSubmitting}
                className={inputClasses}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={stringToDate(formData.endDate)}
              onChange={handleEndDateChange}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              minDate={stringToDate(formData.startDate) || undefined}
              disabled={!formData.startDate || isSubmitting}
              className={inputClasses}
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as LeaveFormData['type'])}
            disabled={isSubmitting}
            className={inputClasses}
          >
            <option value="FULL">Full Day Leave</option>
            <option value="HALF">Half Day Leave</option>
            <option value="EARLY">Early Leave</option>
            <option value="LATE">Late Coming</option>
            <option value="WORK_FROM_HOME">Work From Home</option>
          </select>
        </div>

        {showTimeFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mb-2">
                {formData.type === 'HALF' ? 'Start Time' : 
                 formData.type === 'EARLY' ? 'Leave Time' : 
                 'Arrival Time'} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                disabled={isSubmitting}
                className={inputClasses}
              />
            </div>
            
            {showEndTime && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  disabled={isSubmitting}
                  className={inputClasses}
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-400 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            disabled={isSubmitting}
            placeholder="Please provide a reason for your leave request"
            className={`${inputClasses} resize-none`}
            rows={3}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none disabled:bg-indigo-400 active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-8 py-4 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};