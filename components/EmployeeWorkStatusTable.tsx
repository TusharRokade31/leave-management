'use client';

import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Clock, Home, MessageSquare } from 'lucide-react';
import { getAuthToken } from '@/lib/api/api';
import { toast } from 'react-toastify';

interface Task {
  id: number;
  date: string;
  content: string;
  status: 'PRESENT' | 'WFH' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
  isCompleted: boolean;
  managerComment?: string;
}

interface Leave {
  id: number;
  startDate: string;
  endDate: string;
  type: 'FULL' | 'HALF' | 'EARLY' | 'LATE' | 'WORK_FROM_HOME';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  days: number;
  managerComment?: string;
}

interface Employee {
  user: {
    id: number;
    name: string;
    email: string;
    endDate?: string | null; // Ensure this matches your Prisma schema
  };
  leaves: Leave[];
  tasks: Task[];
}

interface DayDetail {
  employee: Employee;
  date: string;
  day: number;
  task?: Task;
  leave?: Leave;
  status: string;
}

interface EmployeeWorkStatusTableProps {
  employees: Employee[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onUpdateFeedback: (date: string, employeeId: number, comment: string) => Promise<boolean>;
}

const EmployeeWorkStatusTable: React.FC<EmployeeWorkStatusTableProps> = ({
  employees,
  currentMonth,
  onMonthChange,
  onUpdateFeedback,
}) => {
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayDetail | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    onMonthChange(newDate);
  };

  const getDayOfWeek = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toLocaleDateString('default', { weekday: 'short' });
  };

  const isWeekendDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) return true;
    if (dayOfWeek === 6) {
      return day + 7 > daysInMonth;
    }
    return false;
  };

  const normalize = (dateStr: string) => dateStr.split('T')[0];

  const getDateKey = (day: number) => {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDayStatus = (employee: Employee, day: number) => {
    const dateKey = getDateKey(day);
    const task = employee.tasks?.find((t) => normalize(t.date) === dateKey);
    const leave = employee.leaves?.find((leave: Leave) => {
      const start = normalize(leave.startDate);
      const end = normalize(leave.endDate);
      return dateKey >= start && dateKey <= end && leave.status === 'APPROVED';
    });
    return { task, leave, dateKey };
  };

  const getStatusSymbol = (task?: Task, leave?: Leave, isWeekend?: boolean) => {
    if (isWeekend) {
      return { symbol: 'W', color: 'bg-red-50 dark:bg-red-950/20 text-red-400 dark:text-red-500' };
    }
    
    if (leave) {
      switch (leave.type) {
        case 'FULL': return { symbol: 'FL', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300' };
        case 'WORK_FROM_HOME':
          return task?.isCompleted
            ? { symbol: 'WFH/T✓', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' }
            : { symbol: 'WFH/T✗', color: 'bg-blue-50 dark:bg-blue-950/30 text-blue-400 dark:text-blue-500' };
        case 'HALF':
          return task?.isCompleted
            ? { symbol: 'HL/T✓', color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-300' }
            : { symbol: 'HL/T✗', color: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-400 dark:text-yellow-500' };
        case 'EARLY':
          return task?.isCompleted
            ? { symbol: 'EL/T✓', color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' }
            : { symbol: 'EL/T✗', color: 'bg-purple-50 dark:bg-blue-950/30 text-purple-400 dark:text-purple-500' };
        case 'LATE':
          return task?.isCompleted
            ? { symbol: 'LL/T✓', color: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300' }
            : { symbol: 'LL/T✗', color: 'bg-pink-50 dark:bg-pink-950/30 text-pink-400 dark:text-pink-500' };
        default: return { symbol: 'L', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300' };
      }
    }

    if (task) {
      if (task.status === 'WFH') {
        return task.isCompleted
          ? { symbol: 'WFH/T✓', color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300' }
          : { symbol: 'WFH/T✗', color: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-400 dark:text-cyan-500' };
      }
      if (task.status === 'PRESENT') {
        return task.isCompleted
          ? { symbol: 'T✓', color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300' }
          : { symbol: 'T✗', color: 'bg-green-50 dark:bg-green-950/30 text-green-400 dark:text-green-500' };
      }
      if (task.status === 'ABSENT') {
        return { symbol: 'A', color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' };
      }
    }
    return { symbol: '-', color: '' };
  };

  const handleDayClick = (employee: Employee, day: number) => {
    const { task, leave, dateKey } = getDayStatus(employee, day);
    const isWeekend = isWeekendDay(day);
    let status = isWeekend ? 'Weekend' : leave && task ? `On Leave (${leave.type}) + Task ${task.isCompleted ? 'Completed' : 'Incomplete'}` : leave ? `On Leave (${leave.type})` : task ? `${task.status} - Task ${task.isCompleted ? 'Completed' : 'Incomplete'}` : '(No Task Submitted)';

    setSelectedDayDetail({ employee, date: dateKey, day, task, leave, status });
  };

  return (
    <div className="w-full p-2 sm:p-6 bg-gray-50 dark:bg-slate-950/50 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800">
        <div className="bg-indigo-600 dark:bg-indigo-900/80 text-white p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Employee Work Status Monitor</h1>
            <div className="flex gap-2 bg-indigo-700/50 dark:bg-slate-950/30 p-1.5 rounded-xl backdrop-blur-sm">
              <button onClick={() => changeMonth(-1)} className="px-4 py-2 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-lg transition-all font-bold text-sm">← Prev</button>
              <div className="px-4 py-2 font-black text-sm border-x border-indigo-400/30">{monthName}</div>
              <button onClick={() => changeMonth(1)} className="px-4 py-2 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-lg transition-all font-bold text-sm">Next →</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 min-w-[80px] z-20 text-[10px] font-black uppercase text-gray-500 dark:text-slate-400">ID</th>
                <th className="sticky left-[80px] bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 min-w-[180px] z-20 text-[10px] font-black uppercase text-gray-500 dark:text-slate-400">Employee Name</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th key={day} className={`border border-gray-200 dark:border-slate-700 p-2 min-w-[70px] text-center transition-colors ${isWeekendDay(day) ? 'bg-red-50 dark:bg-red-950/20' : 'bg-gray-50 dark:bg-slate-800/50'}`}>
                    <div className="font-black text-gray-800 dark:text-slate-200 text-xs">{day}</div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">{getDayOfWeek(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {employees
                ?.filter((emp) => {
                   // Logic: Show employee if no endDate exists OR if view month is <= offboarding month
                   if (!emp.user.endDate) return true;
                   const offDate = new Date(emp.user.endDate);
                   const viewDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                   return viewDate <= new Date(offDate.getFullYear(), offDate.getMonth(), 1);
                })
                .map((employee) => (
                <tr key={employee.user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 font-bold text-xs text-gray-600 dark:text-slate-400 z-10 transition-colors">#{employee.user.id}</td>
                  <td className="sticky left-[80px] bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 font-black text-xs text-gray-800 dark:text-slate-200 z-10 transition-colors">
                    <div className="flex items-center gap-2">
                      <span>{employee.user.name}</span>
                      {employee.user.endDate && (
                        <span className="text-[7px] bg-red-100 dark:bg-red-900/40 text-red-600 px-1 rounded uppercase font-black">Offboarded</span>
                      )}
                    </div>
                    <div className="text-[9px] text-gray-400 dark:text-slate-500 font-normal">{employee.user.email}</div>
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const { task, leave, dateKey } = getDayStatus(employee, day);
                    const isWeekend = isWeekendDay(day);
                    // Disable interaction for days past end date
                    const isPastEnd = employee.user.endDate && new Date(dateKey) > new Date(employee.user.endDate);
                    const { symbol, color } = isPastEnd 
                      ? { symbol: '', color: 'bg-gray-100/50 dark:bg-slate-800/20 cursor-not-allowed' } 
                      : getStatusSymbol(task, leave, isWeekend);

                    return (
                      <td key={day} onClick={() => !isPastEnd && handleDayClick(employee, day)} className={`border border-gray-100 dark:border-slate-800 p-1 text-center text-[8px] font-black transition-all ${!isPastEnd && 'hover:ring-2 hover:ring-indigo-400 cursor-pointer'} ${color}`}>
                        {symbol}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-4">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <LegendItem color="bg-green-100 dark:bg-green-900/40 text-green-600" label="Task Done" symbol="T✓" />
            <LegendItem color="bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600" label="WFH + Task ✓" symbol="WFH/T✓" />
            <LegendItem color="bg-orange-100 dark:bg-orange-900/40 text-orange-600" label="Full Leave" symbol="FL" />
            <LegendItem color="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600" label="Half + Task" symbol="HL/T✓" />
            <LegendItem color="bg-red-100 dark:bg-red-900/40 text-red-600" label="Absent" symbol="A" />
            <LegendItem color="bg-red-50 dark:bg-red-950/20 text-red-400" label="Weekend" symbol="W" />
          </div>
        </div>
      </div>

      {selectedDayDetail && (
        <DayDetailModal detail={selectedDayDetail} onClose={() => setSelectedDayDetail(null)} onUpdateFeedback={onUpdateFeedback} />
      )}
    </div>
  );
};

const LegendItem = ({ color, label, symbol }: { color: string; label: string; symbol: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-12 h-10 ${color} border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-[8px] font-black`}>{symbol}</div>
    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400">{label}</span>
  </div>
);

const DayDetailModal: React.FC<{ 
  detail: DayDetail; 
  onClose: () => void;
  onUpdateFeedback: (date: string, employeeId: number, comment: string) => Promise<boolean>;
}> = ({ detail, onClose, onUpdateFeedback }) => {
  const [comment, setComment] = useState(detail.task?.managerComment || "");
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSaveComment = async () => {
    if (!detail.task) return;
    setIsSaving(true);
    const success = await onUpdateFeedback(detail.date, detail.employee.user.id, comment);
    if (success) onClose();
    else toast.error("Failed to save feedback");
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-800">
        <div className="sticky top-0 bg-indigo-600 dark:bg-indigo-900/80 text-white p-6 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-black">{detail.employee.user.name}</h2>
              <p className="text-sm text-indigo-200">{formatDate(detail.date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-indigo-700 rounded-lg transition-all"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase mb-2">Status</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">{detail.status}</div>
          </div>

          {detail.leave && (
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-200 dark:border-orange-900">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-sm font-black text-orange-800 dark:text-orange-300 uppercase">Leave Details</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400 font-bold">Type:</span><span className="text-gray-900 dark:text-slate-200 font-bold">{detail.leave.type}</span></div>
                <div className="flex justify-between"><span className="text-gray-600 dark:text-slate-400 font-bold">Duration:</span><span className="text-gray-900 dark:text-slate-200 font-bold">{detail.leave.days} day(s)</span></div>
                <div className="pt-2 border-t border-orange-200 dark:border-orange-900">
                  <span className="text-gray-600 dark:text-slate-400 font-bold block mb-1">Reason:</span>
                  <p className="text-gray-900 dark:text-slate-200">{detail.leave.reason}</p>
                </div>
              </div>
            </div>
          )}

          {detail.task && (
            <div className={`rounded-xl p-4 border ${detail.task.isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200'}`}>
              <h3 className="text-sm font-black uppercase mb-3">Task Details</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-slate-400 font-bold block mb-1">Task Content:</span>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700" dangerouslySetInnerHTML={{ __html: detail.task.content }} />
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400"><MessageSquare size={14} /><label className="text-[10px] font-black uppercase tracking-widest">Manager Feedback</label></div>
                  <textarea className="w-full h-24 rounded-xl p-4 border-2 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 focus:border-indigo-500 text-gray-900 dark:text-slate-200" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <button onClick={handleSaveComment} disabled={isSaving} className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">{isSaving ? "Saving..." : "Update Feedback"}</button>
                </div>
              </div>
            </div>
          )}
          
          {!detail.task && !detail.leave && detail.status !== 'Weekend' && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-8 text-center border border-red-200 dark:border-red-900"><p className="text-gray-500 dark:text-slate-400 text-sm">No task or leave recorded for this day</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeWorkStatusTable;