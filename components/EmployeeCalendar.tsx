"use client";
import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { X, Save } from 'lucide-react';
import { getAuthToken } from '@/lib/api/api'; // Ensure this utility is imported

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

  const fetchTasks = async () => {
    const token = getAuthToken(); // Get the current token
    const url = employeeId ? `/api/tasks?userId=${employeeId}` : '/api/tasks';
    
    try {
      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}` // Include token for authentication
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const taskMap = data.reduce((acc: any, t: any) => ({
          ...acc,
          [format(new Date(t.date), 'yyyy-MM-dd')]: t.content
        }), {});
        setTasks(taskMap);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
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
    const token = getAuthToken();

    // Normalize date to midnight for the database unique constraint
    const normalizedDate = new Date(selectedDate);
    normalizedDate.setHours(0, 0, 0, 0);

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Include token
        },
        body: JSON.stringify({
          date: normalizedDate.toISOString(),
          content: currentPointers
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => ({
          ...prev,
          [format(new Date(updatedTask.date), 'yyyy-MM-dd')]: updatedTask.content
        }));
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border">
      <Calendar 
        onClickDay={handleDayClick}
        tileClassName={({ date }) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          return tasks[dateKey] ? 'bg-blue-100 text-blue-600 font-bold rounded-lg' : '';
        }}
        className="w-full border-none"
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Tasks for {format(selectedDate, 'MMM dd, yyyy')}</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <textarea
              className="w-full h-48 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={viewOnly ? "No tasks logged." : "What did you work on?"}
              value={currentPointers}
              readOnly={viewOnly}
              onChange={(e) => setCurrentPointers(e.target.value)}
            />
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-xl">
                {viewOnly ? "Close" : "Cancel"}
              </button>
              {!viewOnly && (
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};