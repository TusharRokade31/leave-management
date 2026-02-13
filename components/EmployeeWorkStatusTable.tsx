'use client';

import React, { useState } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Clock, Home, MessageSquare, Edit3, Save, RefreshCcw } from 'lucide-react';
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
    endDate?: string | null;
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
  onUpdateDayLeaveStatus?: (leaveId: number, targetDate: string, newType: string, newStatus: string, comment: string) => Promise<boolean>;
}

const EmployeeWorkStatusTable: React.FC<EmployeeWorkStatusTableProps> = ({
  employees,
  currentMonth,
  onMonthChange,
  onUpdateFeedback,
  onUpdateDayLeaveStatus,
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
    return dayOfWeek === 0;
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
      return dateKey >= start && dateKey <= end;
    });
    return { task, leave, dateKey };
  };

  const getStatusSymbol = (task?: Task, leave?: Leave, isWeekend?: boolean) => {
    if (isWeekend) {
      return { symbol: 'W', color: 'bg-red-50 dark:bg-red-950/20 text-red-400 dark:text-red-500' };
    }
    
    if (leave) {
      const isPending = leave.status === 'PENDING';
      const borderStyle = isPending ? 'ring-2 ring-amber-400 ring-inset' : '';

      switch (leave.type) {
        case 'FULL': return { symbol: 'FL', color: `bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 ${borderStyle}` };
        case 'WORK_FROM_HOME':
          return task?.isCompleted
            ? { symbol: 'WFH/T✓', color: `bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 ${borderStyle}` }
            : { symbol: 'WFH/T✗', color: `bg-blue-50 dark:bg-blue-950/30 text-blue-400 dark:text-blue-500 ${borderStyle}` };
        case 'HALF':
          return task?.isCompleted
            ? { symbol: 'HL/T✓', color: `bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-300 ${borderStyle}` }
            : { symbol: 'HL/T✗', color: `bg-yellow-50 dark:bg-blue-950/30 text-yellow-400 dark:text-yellow-500 ${borderStyle}` };
        case 'EARLY':
          return task?.isCompleted
            ? { symbol: 'EL/T✓', color: `bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 ${borderStyle}` }
            : { symbol: 'EL/T✗', color: `bg-purple-50 dark:bg-blue-950/30 text-purple-400 dark:text-purple-500 ${borderStyle}` };
        case 'LATE':
          return task?.isCompleted
            ? { symbol: 'LL/T✓', color: `bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 ${borderStyle}` }
            : { symbol: 'LL/T✗', color: `bg-pink-50 dark:bg-pink-950/30 text-pink-400 dark:text-pink-500 ${borderStyle}` };
        default: return { symbol: 'L', color: `bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 ${borderStyle}` };
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
    let status = isWeekend ? 'Weekend' : leave && task ? `On Leave (${leave.type}) + Task ${task.isCompleted ? 'Completed' : 'Incomplete'}` : leave ? `On Leave (${leave.type}) - ${leave.status}` : task ? `${task.status} - Task ${task.isCompleted ? 'Completed' : 'Incomplete'}` : '(No Task Submitted)';

    setSelectedDayDetail({ employee, date: dateKey, day, task, leave, status });
  };

  return (
    <div className="w-full p-2 sm:p-6 bg-gray-50 dark:bg-slate-950/50 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col h-[750px]">
        
        <div className="bg-indigo-600 dark:bg-indigo-900/80 text-white p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Employee Work Status Monitor</h1>
            <div className="flex gap-2 bg-indigo-700/50 dark:bg-slate-950/30 p-1.5 rounded-xl backdrop-blur-sm">
              <button onClick={() => changeMonth(-1)} className="px-4 py-2 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-lg transition-all font-bold text-sm">← Prev</button>
              <div className="px-4 py-2 font-black text-sm border-x border-indigo-400/30">{monthName}</div>
              <button onClick={() => changeMonth(1)} className="px-4 py-2 hover:bg-indigo-500 dark:hover:bg-indigo-800 rounded-lg transition-all font-bold text-sm">Next →</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 border-t border-gray-100 dark:border-slate-800">
          <table className="w-full border-separate border-spacing-0 table-fixed min-w-max">
            <thead className="sticky top-0 z-[60]">
              <tr className="bg-gray-100 dark:bg-slate-800">
                <th className="sticky left-0 top-0 z-[70] bg-gray-100 dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-700 p-3 w-[80px] text-[10px] font-black uppercase text-gray-500 dark:text-slate-400">ID</th>
                <th className="sticky left-[80px] top-0 z-[70] bg-gray-100 dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-700 p-3 w-[180px] text-[10px] font-black uppercase text-gray-500 dark:text-slate-400">Employee Name</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th key={day} className={`sticky top-0 z-[50] border-b border-r border-gray-200 dark:border-slate-700 p-2 w-[70px] text-center transition-colors ${isWeekendDay(day) ? 'bg-red-50 dark:bg-red-950/20' : 'bg-gray-50 dark:bg-slate-800'}`}>
                    <div className="font-black text-gray-800 dark:text-slate-200 text-xs">{day}</div>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">{getDayOfWeek(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {employees
                ?.filter((emp) => {
                   if (!emp.user.endDate) return true;
                   const offDate = new Date(emp.user.endDate);
                   const viewDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                   return viewDate <= new Date(offDate.getFullYear(), offDate.getMonth(), 1);
                })
                .map((employee) => (
                <tr key={employee.user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-3 font-bold text-xs text-gray-600 dark:text-slate-400 transition-colors">#{employee.user.id}</td>
                  <td className="sticky left-[80px] bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-3 font-black text-xs text-gray-800 dark:text-slate-200 z-40 transition-colors">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{employee.user.name}</span>
                        {employee.user.endDate && <span className="text-[7px] bg-red-100 dark:bg-red-900/40 text-red-600 px-1 rounded uppercase font-black flex-shrink-0">Off</span>}
                      </div>
                      <div className="text-[9px] text-gray-400 dark:text-slate-500 font-normal truncate">{employee.user.email}</div>
                    </div>
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const { task, leave, dateKey } = getDayStatus(employee, day);
                    const isWeekend = isWeekendDay(day);
                    const isPastEnd = employee.user.endDate && new Date(dateKey) > new Date(employee.user.endDate);
                    const { symbol, color } = isPastEnd ? { symbol: '', color: 'bg-gray-100/50 dark:bg-slate-800/20 cursor-not-allowed' } : getStatusSymbol(task, leave, isWeekend);

                    return (
                      <td 
                        key={day} 
                        onClick={() => !isPastEnd && handleDayClick(employee, day)} 
                        className={`border-r border-gray-100 dark:border-slate-800 p-1 text-center text-[8px] font-black transition-all ${!isPastEnd && 'hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 cursor-pointer'} ${color}`}
                      >
                        {symbol}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-4">Status Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
        <DayDetailModal 
          detail={selectedDayDetail} 
          onClose={() => setSelectedDayDetail(null)} 
          onUpdateFeedback={onUpdateFeedback} 
          onUpdateDayLeaveStatus={onUpdateDayLeaveStatus} 
        />
      )}
    </div>
  );
};

const LegendItem = ({ color, label, symbol }: { color: string; label: string; symbol: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-10 h-8 ${color} border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-[8px] font-black`}>{symbol}</div>
    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 whitespace-nowrap">{label}</span>
  </div>
);

const DayDetailModal: React.FC<{ 
  detail: DayDetail; 
  onClose: () => void;
  onUpdateFeedback: (date: string, employeeId: number, comment: string) => Promise<boolean>;
  onUpdateDayLeaveStatus?: (leaveId: number, targetDate: string, newType: string, newStatus: string, comment: string) => Promise<boolean>;
}> = ({ detail, onClose, onUpdateFeedback, onUpdateDayLeaveStatus }) => {
  const [comment, setComment] = useState(detail.leave?.managerComment || detail.task?.managerComment || "");
  const [selectedType, setSelectedType] = useState(detail.leave?.type || "FULL");
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleCentralUpdate = async () => {
    setIsSaving(true);
    let success = false;

    if (detail.leave && onUpdateDayLeaveStatus) {
      // Logic for Leave modification - Defaulting status to APPROVED on update
      success = await onUpdateDayLeaveStatus(detail.leave.id, detail.date, selectedType, "APPROVED", comment);
    } else if (detail.task) {
      success = await onUpdateFeedback(detail.date, detail.employee.user.id, comment);
    }

    if (success) {
      toast.success("Work status synced successfully");
      onClose();
    } else {
      toast.error("Process failed");
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        <div className="sticky top-0 bg-indigo-600 dark:bg-indigo-900/80 text-white p-6 flex items-center justify-between rounded-t-2xl z-10">
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
            <div className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase mb-2">Original State</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">{detail.status}</div>
          </div>

          {detail.task && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-black uppercase">Task Details</h3>
              </div>
              
              
                <div className="pt-2">
                  <span className="text-gray-600 dark:text-slate-400 font-bold block mb-1">Task Content:</span>
                  {/* FIX 1: HTML Rendering */}
                  <div 
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700
                        [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2
                        [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2
                        [&_li]:my-1"
                      dangerouslySetInnerHTML={{ __html: detail.task.content }} 
                    />
                </div>
                </>)}

             {!detail.task?.content && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-8 text-center border border-red-200 dark:border-red-900">
                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium italic">No activity recorded for this specific date.</p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5 border border-amber-200 dark:border-amber-900/50 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Edit3 className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-tight">Modify Work Entry</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {detail.leave && (
              <div>
                <label className="text-[10px] font-black text-amber-700/70 uppercase mb-2 block tracking-widest">
                  Adjust Leave Type
                </label>
                <select 
                  value={selectedType} 
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-amber-200 dark:border-amber-900 p-3 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="FULL">Full Day Leave</option>
                  <option value="HALF">Half Day Leave</option>
                  <option value="EARLY">Early Leave</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
                </select>
              </div>
            )}

            {/* Added conditional col-span-2 if detail.leave is falsy */}
            <div className={`flex flex-col h-full ${!detail.leave ? 'md:col-span-2' : ''}`}>
              <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-2 block tracking-widest">
                Manager Feedback
              </label>
              <textarea 
                className="flex-1 w-full min-h-[100px] rounded-xl p-4 border-2 bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-800 focus:border-indigo-500 text-gray-900 dark:text-slate-200 transition-all outline-none text-sm italic" 
                placeholder="Reason for change or task feedback..."
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
              />
            </div>
          </div>

            {detail.leave && detail.leave.days > 1 && (
               <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg">
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold leading-tight">
                    * Modifying this date will automatically separate it from the multi-day request.
                  </p>
               </div>
            )}

            <button 
              onClick={handleCentralUpdate} 
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save size={20} />}
              {isSaving ? "Synchronizing..." : "Update Current Day Status"}
            </button>
          </div>

          {detail.leave && (
             <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Employee Reason</span>
                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium italic">"{detail.leave.reason}"</p>
             </div>
          )}

          {!detail.task && !detail.leave && detail.status !== 'Weekend' && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-8 text-center border border-red-200 dark:border-red-900">
                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium italic">No activity recorded for this specific date.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeWorkStatusTable;