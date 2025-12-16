// LeaveForm.tsx
import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { LeaveFormData } from '@/type/form';

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

  // Convert string to Date object
  const stringToDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Convert Date object to YYYY-MM-DD string
  const dateToString = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate time for specific leave types
    if (['HALF', 'EARLY', 'LATE'].includes(formData.type) && !formData.startTime) {
      alert('Please select time for this leave type');
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">New Leave Request</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={stringToDate(formData.startDate)}
              onChange={handleStartDateChange}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              selected={stringToDate(formData.endDate)}
              onChange={handleEndDateChange}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              minDate={stringToDate(formData.startDate)}
              disabled={!formData.startDate || isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              showYearDropdown
              showMonthDropdown
              dropdownMode="select"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as LeaveFormData['type'])}
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
          >
            <option value="FULL">Full Day Leave</option>
            <option value="HALF">Half Day Leave</option>
            <option value="EARLY">Early Leave</option>
            <option value="LATE">Late Coming</option>
          </select>
        </div>

        {showTimeFields && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === 'HALF' ? 'Start Time' : 
                 formData.type === 'EARLY' ? 'Leave Time' : 
                 'Arrival Time'} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                disabled={isSubmitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            
            {showEndTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
            disabled={isSubmitting}
            placeholder="Please provide a reason for your leave request"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
            rows={3}
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
          </button>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};