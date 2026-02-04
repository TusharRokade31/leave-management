import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

const EmployeeCalendar = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [leaves, setLeaves] = useState<any[]>([]);
  const [currentPointers, setCurrentPointers] = useState('');

  // Fetch existing tasks and leaves on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [tasksRes, leavesRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/leaves/my-leaves')
    ]);
    const tasksData = await tasksRes.json();
    const leavesData = await leavesRes.json();
    
    // Map tasks to a date-keyed object for easy lookup
    const taskMap = tasksData.reduce((acc: any, task: any) => {
      acc[format(new Date(task.date), 'yyyy-MM-dd')] = task.content;
      return acc;
    }, {});
    
    setTasks(taskMap);
    setLeaves(leavesData);
  };

  const handleSaveTask = async () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateKey, content: currentPointers }),
    });

    if (response.ok) {
      setTasks({ ...tasks, [dateKey]: currentPointers });
      alert('Task saved successfully!');
    }
  };

  // Logic for color-coding the calendar tiles
  const getTileClassName = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return '';
    
    const dateKey = format(date, 'yyyy-MM-dd');
    
    // Check if date is within a leave period
    const isOnLeave = leaves.some(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      return date >= start && date <= end && leave.status === 'APPROVED';
    });

    if (isOnLeave) return 'bg-red-200 text-red-800 rounded-full'; // Leave style
    if (tasks[dateKey]) return 'bg-green-200 text-green-800 rounded-full'; // Task filled style
    
    return '';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">My Attendance & Daily Tasks</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Calendar
            onChange={(d) => {
              const date = d as Date;
              setSelectedDate(date);
              setCurrentPointers(tasks[format(date, 'yyyy-MM-dd')] || '');
            }}
            value={selectedDate}
            tileClassName={getTileClassName}
            className="border-none shadow-sm rounded-lg"
          />
          <div className="mt-4 flex gap-4 text-sm">
            <span className="flex items-center"><div className="w-3 h-3 bg-green-200 mr-2"></div> Task Filled</span>
            <span className="flex items-center"><div className="w-3 h-3 bg-red-200 mr-2"></div> On Leave</span>
          </div>
        </div>

        <div className="flex flex-col">
          <h3 className="font-semibold mb-2">
            Tasks for {format(selectedDate, 'PPP')}
          </h3>
          <textarea
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="• Enter daily task pointers here..."
            value={currentPointers}
            onChange={(e) => setCurrentPointers(e.target.value)}
          />
          <button
            onClick={handleSaveTask}
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Save Daily Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendar;