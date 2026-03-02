'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Clock, Edit3, Save, RefreshCcw, Building2, ListTodo, Plus, Trash2, ChevronLeft, ChevronRight, Search, User } from 'lucide-react';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-32 w-full bg-gray-50 animate-pulse rounded-xl" />,
});
import 'react-quill/dist/quill.snow.css';

/* ─────────────────────────────────────────────────────────
    Interfaces
───────────────────────────────────────────────────────── */
interface AssignedTask {
  userId: number; 
  id?: number;   
  company: string;
  task: string;
  isDone: boolean;
  assignedAt?: string;
  companyName?: string;
  taskTitle?: string;
}

interface Task {
  id: number;
  date: string;
  content: string;
  status: 'PRESENT' | 'WFH' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';
  isCompleted: boolean;
  managerComment?: string;
  assignedTasks?: AssignedTask[];
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
  companies: string[];
  onSaveNewCompany: (name: string) => Promise<void>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onUpdateFeedback: (date: string, employeeId: number, comment: string, assignedTasks?: AssignedTask[]) => Promise<boolean>;
  onAssignTasks: (date: string, employeeId: number, assignedTasks: AssignedTask[]) => Promise<boolean>;
  onUpdateDayLeaveStatus?: (leaveId: number, targetDate: string, newType: string, newStatus: string, comment: string) => Promise<boolean>;
}

const DEFAULT_COMPANIES = ['Internal Project', 'SCT | Oil & Gas', 'Client Alpha'];

/* ─────────────────────────────────────────────────────────
    Helpers
───────────────────────────────────────────────────────── */
const normalizeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const hasContent = (task?: Task) => 
  task && task.content && task.content.trim() !== '' && task.content !== '<p><br></p>';

const buildStatus = (task?: Task, leave?: Leave, isWeekend?: boolean) => {
  if (isWeekend) return 'Weekend';
  const done = hasContent(task);
  if (leave && task && done) return `On Leave (${leave.type}) + Task Completed`;
  if (leave) return `On Leave (${leave.type}) - ${leave.status}`;
  if (task && done) return `${task.status} - Task Completed`;
  return '(No Task Submitted)';
};

/* ─────────────────────────────────────────────────────────
    Main Table Component
───────────────────────────────────────────────────────── */
const EmployeeWorkStatusTable: React.FC<EmployeeWorkStatusTableProps> = ({
  employees,
  companies = [],
  onSaveNewCompany,
  currentMonth,
  onMonthChange,
  onUpdateFeedback,
  onAssignTasks,
  onUpdateDayLeaveStatus,
}) => {
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayDetail | null>(null);
  const [mobileSearch, setMobileSearch] = useState('');
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter Logic for Mobile Search
  const filteredEmployees = useMemo(() => {
    return employees?.filter(emp => 
      emp.user.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
      emp.user.id.toString().includes(mobileSearch)
    );
  }, [employees, mobileSearch]);

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    onMonthChange(newDate);
  };

  const getDayOfWeek = (day: number) =>
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toLocaleDateString('default', { weekday: 'short' });

  const isWeekendDay = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay();
    return d === 0;
  };

  const getDateKey = (day: number) =>
    `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getDayStatus = (employee: Employee, day: number) => {
    const dateKey = getDateKey(day);
    const task = employee.tasks?.find((t) => normalizeDate(t.date) === dateKey);
    const leave = employee.leaves?.find((l: Leave) => {
      const start = normalizeDate(l.startDate);
      const end = normalizeDate(l.endDate);
      return dateKey >= start && dateKey <= end;
    });
    return { task, leave, dateKey };
  };

  const getStatusSymbol = (task?: Task, leave?: Leave, isWeekend?: boolean) => {
    if (isWeekend) return { symbol: 'W', color: 'bg-red-50 dark:bg-red-950/20 text-red-400 dark:text-red-500' };
    const submitted = hasContent(task);
    if (leave) {
      const border = leave.status === 'PENDING' ? 'ring-2 ring-amber-400 ring-inset' : '';
      switch (leave.type) {
        case 'FULL': return { symbol: 'FL', color: `bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 ${border}` };
        case 'WORK_FROM_HOME': return { symbol: submitted ? 'WFH ✓' : 'WFH', color: `bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 ${border}` };
        case 'EARLY': return { symbol: submitted ? 'EL ✓' : 'EL', color: `bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 ${border}` };
        case 'HALF': return { symbol: submitted ? 'HL ✓' : 'HL', color: `bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 ${border}` };
        case 'LATE': return { symbol: submitted ? 'LT ✓' : 'LT', color: `bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 ${border}` };
        default: return { symbol: 'L', color: `bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 ${border}` };
      }
    }
    if (task) {
      if (task.status === 'WFH') return { symbol: submitted ? 'WFH ✓' : 'WFH', color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300' };
      if (task.status === 'PRESENT') return { symbol: submitted ? 'T✓' : '-', color: submitted ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300' : '' };
      if (task.status === 'ABSENT') return { symbol: 'A', color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' };
    }
    return { symbol: '-', color: '' };
  };

  const handleDayClick = (employee: Employee, day: number) => {
    const { task, leave, dateKey } = getDayStatus(employee, day);
    setSelectedDayDetail({
      employee,
      date: dateKey,
      day,
      task,
      leave,
      status: buildStatus(task, leave, isWeekendDay(day)),
    });
  };

  useEffect(() => {
    if (!selectedDayDetail) return;
    const updatedEmployee = employees.find((e) => e.user.id === selectedDayDetail.employee.user.id);
    if (!updatedEmployee) return;
    const { task, leave } = getDayStatus(updatedEmployee, selectedDayDetail.day);
    setSelectedDayDetail((prev) => prev ? ({
        ...prev,
        employee: updatedEmployee,
        task,
        leave,
        status: buildStatus(task, leave, isWeekendDay(selectedDayDetail.day)),
    }) : null);
  }, [employees]);

  return (
    <div className="w-full p-2 sm:p-6 bg-gray-50 dark:bg-slate-950/50 min-h-screen">
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col h-auto sm:h-[800px]">
        
        {/* Responsive Header Section */}
        <div className="bg-indigo-600 dark:bg-indigo-900 text-white p-5 sm:p-8 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-3xl font-black tracking-tighter uppercase">Work Monitor</h1>
              <p className="text-indigo-200 text-[10px] sm:text-xs font-bold tracking-widest uppercase mt-1">Attendance & Tasks</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {/* Search Bar for Mobile/Tablet */}
              <div className="relative w-full sm:w-64 sm:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search Employee..." 
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  className="w-full bg-indigo-700/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold placeholder:text-white/30 outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Month Navigation */}
              <div className="flex gap-2 bg-indigo-700/50 p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto justify-center">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft size={20}/></button>
                <div className="px-4 sm:px-6 py-2 font-black text-[10px] sm:text-xs bg-white text-indigo-600 rounded-xl shadow-lg flex items-center uppercase">{monthName}</div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronRight size={20}/></button>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Content: Table for Desktop, Cards for Mobile */}
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-slate-800">
          {/* Desktop Table View */}
          <table className="hidden sm:table w-full border-separate border-spacing-0 table-fixed min-w-max">
            <thead className="sticky top-0 z-[60]">
              <tr className="bg-gray-100 dark:bg-slate-800">
                <th className="sticky left-0 top-0 z-[70] bg-gray-100 dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-700 p-4 w-[80px] text-[10px] font-black uppercase text-gray-400">ID</th>
                <th className="sticky left-[60px] sm:left-[80px] top-0 z-[70] bg-gray-100 dark:bg-slate-800 border-b border-r border-gray-200 dark:border-slate-700 p-4 w-[120px] sm:w-[200px] text-[10px] font-black uppercase text-gray-400">Employee</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                  <th key={day} className={`border-b border-r border-gray-100 dark:border-slate-800 p-2 w-[75px] text-center ${isWeekendDay(day) ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                    <div className="font-black text-gray-900 dark:text-slate-200 text-sm">{day}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase">{getDayOfWeek(day)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredEmployees?.map((employee) => (
                <tr key={employee.user.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-r border-gray-100 dark:border-slate-800 p-4 font-bold text-xs text-gray-500">#{employee.user.id}</td>
                  <td className="sticky left-[60px] sm:left-[80px] bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-r border-gray-100 dark:border-slate-800 p-4 font-black text-xs text-gray-800 dark:text-slate-200 z-40 truncate">{employee.user.name}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const { task, leave } = getDayStatus(employee, day);
                    const { symbol, color } = getStatusSymbol(task, leave, isWeekendDay(day));
                    return (
                      <td key={day} onClick={() => handleDayClick(employee, day)} className={`border-r border-gray-50 dark:border-slate-800/50 p-1 text-center text-[8px] font-black transition-all hover:scale-110 cursor-pointer ${color}`}>
                        <div className="py-2 rounded-md">{symbol}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card Directory View */}
          <div className="sm:hidden p-4 space-y-4">
            {filteredEmployees?.map((employee) => (
              <div key={employee.user.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-100 dark:border-indigo-800">{employee.user.name.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{employee.user.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID #{employee.user.id}</p>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const { task, leave } = getDayStatus(employee, day);
                    const { symbol, color } = getStatusSymbol(task, leave, isWeekendDay(day));
                    return (
                      <button key={day} onClick={() => handleDayClick(employee, day)} className={`aspect-square rounded-lg flex flex-col items-center justify-center border border-black/5 transition-all active:scale-90 ${color}`}>
                        <span className="text-[7px] opacity-40 font-bold">{day}</span>
                        <span className="text-[8px] font-black">{symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend / Footer */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center text-center">
            <LegendItem color="bg-green-100 text-green-600" label="Task" symbol="T✓" />
            <LegendItem color="bg-sky-100 dark:bg-sky-900/40 text-sky-600" label="WFH" symbol="WFH" />
            <LegendItem color="bg-red-100 dark:bg-red-900/40 text-red-600" label="Full" symbol="FL" />
            <LegendItem color="bg-amber-100 dark:bg-amber-900/40 text-amber-600" label="Half" symbol="HL" />
            <LegendItem color="bg-violet-100 dark:bg-violet-900/40 text-violet-600" label="Early" symbol="EL" />
            <LegendItem color="bg-red-50 text-red-400" label="Weekend" symbol="W" />
          </div>
        </div>
      </div>

      {selectedDayDetail && (
        <DayDetailModal
          detail={selectedDayDetail}
          dbCompanies={companies.length > 0 ? companies : DEFAULT_COMPANIES}
          onSaveNewCompany={onSaveNewCompany}
          onClose={() => setSelectedDayDetail(null)}
          onUpdateFeedback={onUpdateFeedback}
          onAssignTasks={onAssignTasks}
          onUpdateDayLeaveStatus={onUpdateDayLeaveStatus}
        />
      )}
    </div>
  );
};

const LegendItem = ({ color, label, symbol }: { color: string; label: string; symbol: string }) => (
  <div className="flex items-center gap-1.5 sm:gap-2">
    <div className={`w-6 h-6 sm:w-7 sm:h-7 ${color} rounded-lg flex items-center justify-center text-[8px] sm:text-[9px] font-black border border-black/5 flex-shrink-0`}>{symbol}</div>
    <span className="text-[8px] sm:text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase truncate max-w-[45px] sm:max-w-none">{label}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────
    Day Detail Modal (Fully Responsive)
───────────────────────────────────────────────────────── */
const DayDetailModal: React.FC<{
  detail: DayDetail;
  dbCompanies: string[];
  onSaveNewCompany: (name: string) => Promise<void>;
  onClose: () => void;
  onUpdateFeedback: (date: string, employeeId: number, comment: string, assignedTasks?: AssignedTask[]) => Promise<boolean>;
  onAssignTasks: (date: string, employeeId: number, assignedTasks: AssignedTask[]) => Promise<boolean>;
  onUpdateDayLeaveStatus?: (leaveId: number, targetDate: string, newType: string, newStatus: string, comment: string) => Promise<boolean>;
}> = ({ detail, dbCompanies = [], onSaveNewCompany, onClose, onUpdateFeedback, onAssignTasks, onUpdateDayLeaveStatus }) => {

  const [comment, setComment] = useState(detail.leave?.managerComment || detail.task?.managerComment || '');
  const [selectedType, setSelectedType] = useState<string>(detail.leave?.type || 'FULL');
  const [isSaving, setIsSaving] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(detail.task?.assignedTasks || []);
  const [newTaskCompany, setNewTaskCompany] = useState(dbCompanies?.[0] || '');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddAssignment = async () => {
    if (!newTaskContent || newTaskContent === '<p><br></p>') { toast.warning('Enter task details'); return; }
    const newTask: AssignedTask = { company: newTaskCompany, task: newTaskContent, isDone: false, assignedAt: new Date().toISOString(), userId: detail.employee.user.id };
    const updatedTasks = [...assignedTasks, newTask];
    setIsSaving(true);
    const success = await onAssignTasks(detail.date, detail.employee.user.id, updatedTasks);
    if (success) {
      setAssignedTasks(updatedTasks);
      setNewTaskContent('');
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    }
    setIsSaving(false);
  };

  const handleCentralUpdate = async () => {
    setIsSaving(true);
    let success = false;
    if (detail.leave && onUpdateDayLeaveStatus) {
      success = await onUpdateDayLeaveStatus(detail.leave.id, detail.date, selectedType, 'APPROVED', comment);
    } else {
      success = await onUpdateFeedback(detail.date, detail.employee.user.id, comment, assignedTasks);
    }
    if (success) { toast.success('Record synchronized'); onClose(); }
    setIsSaving(false);
  };

  const formatAssignedAt = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch (e) { return ""; }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-7xl h-[95vh] sm:h-auto sm:max-h-[92vh] overflow-hidden border border-white/20 dark:border-slate-800 flex flex-col">
        {/* Modal Header */}
        <div className="bg-indigo-600 p-5 sm:p-8 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shrink-0"><Calendar size={24} /></div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black tracking-tight truncate">{detail.employee.user.name}</h2>
              <p className="text-indigo-100 text-[10px] sm:text-xs font-bold uppercase tracking-widest truncate">{new Date(detail.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-xl transition-all flex-shrink-0"><X size={24} /></button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Column 1: Assign Tasks */}
            <div className="bg-indigo-50/50 dark:bg-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-indigo-100 dark:border-slate-700 flex flex-col space-y-4 sm:h-[600px]">
              <div className="flex items-center gap-3 flex-shrink-0"><ListTodo className="w-5 h-5 text-indigo-600" /><h3 className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase italic">Assign Tasks</h3></div>
              <div className="space-y-4">
                <select value={newTaskCompany} onChange={(e) => setNewTaskCompany(e.target.value)} className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-800 p-2.5 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none">
                  {dbCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border-2 border-indigo-100 dark:border-indigo-800 h-[160px] flex flex-col 
                  [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 dark:[&_.ql-toolbar]:bg-slate-800/50 [&_.ql-toolbar]:flex-shrink-0
                  [&_.ql-container]:flex-1 [&_.ql-container]:flex [&_.ql-container]:flex-col [&_.ql-container]:min-h-0 [&_.ql-container]:border-none
                  [&_.ql-editor]:flex-1 [&_.ql-editor]:overflow-y-auto [&_.ql-editor]:max-h-full [&_.ql-editor]:absolute [&_.ql-editor]:inset-0">
                  <ReactQuill theme="snow" value={newTaskContent} onChange={setNewTaskContent} className="flex-1 flex flex-col min-h-0 overflow-hidden" modules={{ toolbar: [['bold', 'italic'], [{ list: 'bullet' }]] }} placeholder="Task details..." />
                </div>
                <button onClick={handleAddAssignment} disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">{isSaving ? 'Syncing...' : 'Add Task'}</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                {assignedTasks.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-50 dark:border-slate-700 shadow-sm relative">
                    <div className="flex justify-between items-start mb-2"><span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase">{item.company}</span><button onClick={() => { const updated = assignedTasks.filter((_, i) => i !== idx); setAssignedTasks(updated); onAssignTasks(detail.date, detail.employee.user.id, updated); }} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></div>
                    <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.task }} />
                    <div className="mt-2 text-[8px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/>{formatAssignedAt(item.assignedAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Employee Submission */}
            <div className="bg-gray-50 dark:bg-slate-800/30 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-gray-100 dark:border-slate-800 flex flex-col h-auto sm:h-[600px]">
              <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Employee Submission</h3>
              <div className="bg-white/50 dark:bg-slate-900/50 p-5 rounded-2xl flex-1 overflow-y-auto border border-slate-100 dark:border-slate-700">
                {detail.task ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium" dangerouslySetInnerHTML={{ __html: detail.task.content }} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center opacity-50"><Clock size={48} className="mb-2" /><p className="text-xs font-bold uppercase">Pending Submission</p></div>
                )}
              </div>
            </div>

            {/* Column 3: Manager Action */}
            <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-amber-100 dark:border-amber-900/30 flex flex-col space-y-4 h-auto sm:h-[600px]">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500"><Edit3 size={18} /><h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Manager Action</h3></div>
              <div className="space-y-4 flex-1">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30"><label className="text-[9px] font-black text-amber-700 uppercase block mb-1">Live Status</label><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{detail.status}</p></div>
                <div className="flex-1"><label className="text-[9px] font-black text-amber-700 uppercase block mb-2 tracking-widest">Feedback</label><textarea className="w-full h-40 bg-white dark:bg-slate-900 border-2 border-amber-100 dark:border-amber-900/30 p-3 rounded-xl text-sm outline-none focus:border-indigo-500 resize-none shadow-sm dark:text-white font-medium" placeholder="Provide feedback..." value={comment} onChange={(e) => setComment(e.target.value)} /></div>
              </div>
              <button onClick={handleCentralUpdate} disabled={isSaving} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl">{isSaving ? 'Syncing...' : 'Save & Sync'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeWorkStatusTable;