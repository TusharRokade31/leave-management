import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format } from 'date-fns';

const TaskCalendar = ({ viewOnly = false, employeeId = null }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [tasks, setTasks] = useState({});
  const [content, setContent] = useState('');

  useEffect(() => {
    const url = employeeId ? `/api/tasks?userId=${employeeId}` : '/api/tasks';
    fetch(url).then(res => res.json()).then(data => {
      const map = data.reduce((acc, t) => ({ ...acc, [format(new Date(t.date), 'yyyy-MM-dd')]: t.content }), {});
      setTasks(map);
    });
  }, [employeeId]);

  const handleDayClick = (date) => {
    setSelectedDate(date);
    setContent(tasks[format(date, 'yyyy-MM-dd')] || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ date: dateKey, content }),
    });
    setTasks({ ...tasks, [dateKey]: content });
    setShowModal(false);
  };

  return (
    <div className="p-4">
      <Calendar 
        onClickDay={handleDayClick}
        tileClassName={({ date }) => tasks[format(date, 'yyyy-MM-dd')] ? 'bg-green-100 border-green-500 border-2' : ''}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Tasks for {format(selectedDate, 'PPP')}</h3>
              <textarea
                className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={content}
                readOnly={viewOnly}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Log your daily pointers..."
              />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Close</button>
                {!viewOnly && (
                  <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Pointers</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};