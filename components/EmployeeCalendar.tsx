"use client";
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { X, Save } from 'lucide-react';

interface Props {
  viewOnly?: boolean;
  employeeId?: number;
}

export const EmployeeCalendar = ({ viewOnly = false, employeeId }: Props) => {
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentPointers, setCurrentPointers] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      const url = employeeId ? `/api/tasks?userId=${employeeId}` : '/api/tasks';
      const res = await fetch(url);
      const data = await res.json();
      const taskMap = data.reduce((acc: any, t: any) => ({
        ...acc,
        [format(new Date(t.date), 'yyyy-MM-dd')]: t.content
      }), {});
      setTasks(taskMap);
    };
    fetchTasks();
  }, [employeeId]);

  const handleDayClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setSelectedDate(date);
    setCurrentPointers(tasks[dateKey] || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const res = await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ date: dateKey, content: currentPointers }),
    });
    if (res.ok) {
      setTasks(prev => ({ ...prev, [dateKey]: currentPointers }));
      setShowModal(false);
    }
    setIsSaving(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border">
      <Calendar
        onClickDay={handleDayClick}
        tileClassName={({ date }) => 
          tasks[format(date, 'yyyy-MM-dd')] ? 'bg-green-100 text-green-800 font-bold rounded-lg' : ''
        }
        className="border-none w-full"
      />

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {format(selectedDate, 'dd MMMM yyyy')}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Task Pointers
              </label>
              <textarea
                className="w-full h-48 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
                placeholder={viewOnly ? "No tasks logged for this day." : "• Worked on login API\n• Fixed CSS issues..."}
                value={currentPointers}
                readOnly={viewOnly}
                onChange={(e) => setCurrentPointers(e.target.value)}
              />

              <div className="mt-6 flex gap-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                >
                  {viewOnly ? "Close" : "Cancel"}
                </button>
                {!viewOnly && (
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Pointers"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};