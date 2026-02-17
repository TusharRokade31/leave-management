'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Clock, Edit3, Save, RefreshCcw, Building2, ListTodo, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-32 w-full bg-gray-50 animate-pulse rounded-xl" />,
});
import 'react-quill/dist/quill.snow.css';

interface AssignedTask {
  company: string;
  task: string;
  isDone: boolean;
  assignedAt?: string;
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

const DEFAULT_COMPANIES = ['Internal Project', 'Company Alpha', 'Company Beta'];

/* ─────────────────────────────────────────────────────────
   Pure helpers (defined outside component so they're stable)
───────────────────────────────────────────────────────── */
const normalizeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const buildStatus = (task?: Task, leave?: Leave, isWeekend?: boolean) => {
  if (isWeekend) return 'Weekend';
  if (leave && task) return `On Leave (${leave.type}) + Task ${task.isCompleted ? 'Completed' : 'Incomplete'}`;
  if (leave) return `On Leave (${leave.type}) - ${leave.status}`;
  if (task) return `${task.status} - Task ${task.isCompleted ? 'Completed' : 'Incomplete'}`;
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

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

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
    if (leave) {
      const border = leave.status === 'PENDING' ? 'ring-2 ring-amber-400 ring-inset' : '';
      switch (leave.type) {
        case 'FULL': return { symbol: 'FL', color: `bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 ${border}` };
        case 'WORK_FROM_HOME':
          return task?.isCompleted
            ? { symbol: 'WFH/T✓', color: `bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 ${border}` }
            : { symbol: 'WFH/T✗', color: `bg-blue-50 dark:bg-blue-950/30 text-blue-400 dark:text-blue-500 ${border}` };
        default: return { symbol: 'L', color: `bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 ${border}` };
      }
    }
    if (task) {
      if (task.status === 'WFH') return task.isCompleted
        ? { symbol: 'WFH/T✓', color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-300' }
        : { symbol: 'WFH/T✗', color: 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-400 dark:text-cyan-500' };
      if (task.status === 'PRESENT') return task.isCompleted
        ? { symbol: 'T✓', color: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300' }
        : { symbol: 'T✗', color: 'bg-green-50 dark:bg-green-950/30 text-green-400 dark:text-green-500' };
      if (task.status === 'ABSENT') return { symbol: 'A', color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' };
    }
    return { symbol: '-', color: '' };
  };

  const handleDayClick = (employee: Employee, day: number) => {
    const { task, leave, dateKey } = getDayStatus(employee, day);
    const isWeekend = isWeekendDay(day);
    setSelectedDayDetail({
      employee,
      date: dateKey,
      day,
      task,
      leave,
      status: buildStatus(task, leave, isWeekend),
    });
  };

  // ── Keep modal detail in sync when the hook surgically updates employees ──
  // The hook's addAssignedTasks does a setEmployees surgical update, which
  // flows here as a new employees prop. We find the same employee+date and
  // refresh the detail — keeping the modal open with fresh task data.
  useEffect(() => {
    if (!selectedDayDetail) return;
    const updatedEmployee = employees.find((e) => e.user.id === selectedDayDetail.employee.user.id);
    if (!updatedEmployee) return;

    const { task, leave } = getDayStatus(updatedEmployee, selectedDayDetail.day);
    const isWeekend = isWeekendDay(selectedDayDetail.day);

    setSelectedDayDetail((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        employee: updatedEmployee,
        task,
        leave,
        status: buildStatus(task, leave, isWeekend),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]); // intentionally only tracks employees changes

  return (
    <div className="w-full p-2 sm:p-6 bg-gray-50 dark:bg-slate-950/50 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800 flex flex-col h-[750px]">
        {/* Header */}
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

        {/* Table */}
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
              {employees?.map((employee) => (
                <tr key={employee.user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-3 font-bold text-xs text-gray-600 dark:text-slate-400 transition-colors">#{employee.user.id}</td>
                  <td className="sticky left-[80px] bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-3 font-black text-xs text-gray-800 dark:text-slate-200 z-40 transition-colors truncate">{employee.user.name}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const { task, leave } = getDayStatus(employee, day);
                    const isWeekend = isWeekendDay(day);
                    const { symbol, color } = getStatusSymbol(task, leave, isWeekend);
                    return (
                      <td
                        key={day}
                        onClick={() => handleDayClick(employee, day)}
                        className={`border-r border-gray-100 dark:border-slate-800 p-1 text-center text-[8px] font-black transition-all hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 cursor-pointer ${color}`}
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

        {/* Legend */}
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

/* ─────────────────────────────────────────────────────────
   Legend Item
───────────────────────────────────────────────────────── */
const LegendItem = ({ color, label, symbol }: { color: string; label: string; symbol: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-10 h-8 ${color} border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-[8px] font-black`}>{symbol}</div>
    <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 whitespace-nowrap">{label}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────
   Day Detail Modal
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

  // ── Local task list — initialized from detail, then kept in sync via useEffect ──
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>(detail.task?.assignedTasks ?? []);

  const [localCompanies, setLocalCompanies] = useState<string[]>(dbCompanies);
  const [newTaskCompany, setNewTaskCompany] = useState(dbCompanies?.[0] || '');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Sync assignedTasks when the parent pushes a refreshed detail down ──
  // We only want to sync from external (prop) changes, not from our own
  // optimistic updates. We track whether we're mid-save to skip prop syncs
  // that would overwrite optimistic state with stale data.
  const isSavingRef = useRef(false);
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    // Skip syncing while a save is in flight — our optimistic state is fresher
    if (isSavingRef.current) return;
    setAssignedTasks(detail.task?.assignedTasks ?? []);
  }, [detail.task?.assignedTasks]);

  // Sync comment/type only when the date changes (different cell opened)
  useEffect(() => {
    setComment(detail.leave?.managerComment || detail.task?.managerComment || '');
    setSelectedType(detail.leave?.type || 'FULL');
  }, [detail.date]);

  useEffect(() => {
    setLocalCompanies(dbCompanies);
    if (!newTaskCompany && dbCompanies.length > 0) setNewTaskCompany(dbCompanies[0]);
  }, [dbCompanies]);

  useEffect(() => {
    if (isAddingNewCompany && inputRef.current) inputRef.current.focus();
  }, [isAddingNewCompany]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatAssignedAt = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const handleAddNewCompany = async () => {
    const name = newCompanyName.trim();
    if (!name) return;
    setIsSaving(true);
    try {
      await onSaveNewCompany(name);
      setLocalCompanies((prev) => [...prev, name]);
      setNewTaskCompany(name);
      setNewCompanyName('');
      setIsAddingNewCompany(false);
    } catch {
      toast.error('Failed to save company');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newTaskContent || newTaskContent === '<p><br></p>') {
      toast.warning('Please enter task details');
      return;
    }
    const newTask: AssignedTask = {
      company: newTaskCompany,
      task: newTaskContent,
      isDone: false,
      assignedAt: new Date().toISOString(),
    };
    const updatedTasks = [...assignedTasks, newTask];

    // Optimistic update
    setAssignedTasks(updatedTasks);
    setNewTaskContent('');
    setIsSaving(true);

    const success = await onAssignTasks(detail.date, detail.employee.user.id, updatedTasks);

    if (success) {
      toast.dismiss();
      setAddSuccess(true);
      toast.success('Task assigned successfully');
      setTimeout(() => setAddSuccess(false), 2000);
    } else {
      // Rollback
      setAssignedTasks(assignedTasks);
      toast.error('Failed to assign task');
    }
    setIsSaving(false);
  };

  const handleRemoveAssignment = async (index: number) => {
    const previousTasks = [...assignedTasks];
    const updatedTasks = assignedTasks.filter((_, i) => i !== index);

    // Optimistic update
    setAssignedTasks(updatedTasks);
    setIsSaving(true);

    const success = await onAssignTasks(detail.date, detail.employee.user.id, updatedTasks);

    if (success) {
      toast.dismiss();
      toast.info('Assignment removed');
    } else {
      // Rollback
      setAssignedTasks(previousTasks);
      toast.error('Removal failed to sync');
    }
    setIsSaving(false);
  };

  const toggleAssignmentStatus = async (index: number) => {
    const updated = assignedTasks.map((t, i) =>
      i === index ? { ...t, isDone: !t.isDone } : t
    );
    setAssignedTasks(updated);
    setIsSaving(true);

    const success = await onAssignTasks(detail.date, detail.employee.user.id, updated);

    if (success) {
      toast.dismiss();
      toast.success('Status updated');
    } else {
      // Rollback
      setAssignedTasks(assignedTasks);
      toast.error('Status update failed');
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

    if (success) {
      toast.success('Work status updated');
      onClose();
    } else {
      toast.error('Process failed');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        {/* Modal Header */}
        <div className="sticky top-0 bg-indigo-600 dark:bg-indigo-900/80 text-white p-6 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-black">{detail.employee.user.name}</h2>
              <p className="text-sm text-indigo-200">{formatDate(detail.date)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-indigo-700 rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Assignment Manager */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-6 border border-indigo-100 dark:border-indigo-900/30 space-y-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2">
              <ListTodo className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">Task Assignment Manager</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              {/* Company + Add Button */}
              <div className="md:col-span-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Client / Company</label>
                  {!isAddingNewCompany ? (
                    <select
                      value={newTaskCompany}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') setIsAddingNewCompany(true);
                        else setNewTaskCompany(e.target.value);
                      }}
                      className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 p-3 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-sm"
                    >
                      {localCompanies.map((c) => <option key={c} value={c}>{c}</option>)}
                      <option value="ADD_NEW" className="text-indigo-600 font-black">+ Add New Company...</option>
                    </select>
                  ) : (
                    <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                      <input
                        ref={inputRef}
                        autoFocus
                        placeholder="Type company name..."
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNewCompany()}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-indigo-500 p-3 rounded-xl text-xs font-bold outline-none shadow-md"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleAddNewCompany} disabled={isSaving} className="flex-1 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg disabled:opacity-50">
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setIsAddingNewCompany(false)} className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[9px] font-black uppercase rounded-lg">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddAssignment}
                  disabled={isSaving}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95 group disabled:opacity-50"
                >
                  {isSaving ? (
                    <><RefreshCcw className="w-4 h-4 animate-spin" />Saving...</>
                  ) : addSuccess ? (
                    <><CheckCircle2 className="w-4 h-4" />Added ✓</>
                  ) : (
                    <><Plus size={16} className="group-hover:rotate-90 transition-transform" />Add Task</>
                  )}
                </button>
              </div>

              {/* Rich Text Editor */}
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Task Requirements & Details</label>
                <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-indigo-100 dark:border-slate-700 shadow-sm focus-within:border-indigo-400 transition-colors">
                  <ReactQuill
                    theme="snow"
                    value={newTaskContent}
                    onChange={setNewTaskContent}
                    placeholder="Type task details here..."
                    modules={{ toolbar: [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']] }}
                  />
                </div>
              </div>
            </div>

            {/* Assignments Queue */}
            <div className="space-y-3 pt-4 border-t border-indigo-100 dark:border-indigo-900/30">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Current Assignments Queue</label>
              {assignedTasks.length > 0 ? assignedTasks.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 group">
                  <input
                    type="checkbox"
                    checked={item.isDone}
                    onChange={() => toggleAssignmentStatus(idx)}
                    className="mt-1 h-5 w-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 uppercase">
                        <Building2 size={10} /> {item.company}
                      </span>
                      {item.assignedAt && (
                        <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock size={10} /> {formatAssignedAt(item.assignedAt)}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-sm prose prose-sm dark:prose-invert max-w-none ${item.isDone ? 'line-through opacity-50' : ''}`}
                      dangerouslySetInnerHTML={{ __html: item.task }}
                    />
                  </div>
                  <button onClick={() => handleRemoveAssignment(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 transition-all">
                    <XCircle size={16} />
                  </button>
                </div>
              )) : (
                <div className="text-center py-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900/30 rounded-2xl">
                  <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">No tasks assigned for today</p>
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-slate-800" />

          {/* Status Banner */}
          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
            <div className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase mb-2">Original State</div>
            <div className="text-lg font-bold text-gray-800 dark:text-slate-200">{detail.status}</div>
          </div>

          {/* Employee Log */}
          {detail.task && (
            <div className="pt-2">
              <h3 className="text-sm font-black uppercase text-gray-800 dark:text-slate-200 mb-2">Employee Daily Log</h3>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-100 dark:border-slate-800"
                dangerouslySetInnerHTML={{ __html: detail.task.content }}
              />
            </div>
          )}

          {/* Modify Work Entry */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-5 border border-amber-200 dark:border-amber-900/50 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Edit3 className="w-4 h-4 text-amber-800" />
              <h3 className="text-sm font-black uppercase tracking-tight text-amber-800 dark:text-amber-400">Modify Work Entry</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {detail.leave && (
                <div>
                  <label className="text-[10px] font-black text-amber-700/70 uppercase mb-2 block tracking-widest">Adjust Leave Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border-2 border-amber-200 p-3 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="FULL">Full Day Leave</option>
                    <option value="HALF">Half Day Leave</option>
                    <option value="EARLY">Early Leave</option>
                    <option value="LATE">Late Arrival</option>
                    <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
                  </select>
                </div>
              )}
              <div className={`flex flex-col h-full ${!detail.leave ? 'md:col-span-2' : ''}`}>
                <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-2 block tracking-widest">Manager Feedback</label>
                <textarea
                  className="flex-1 w-full min-h-[100px] rounded-xl p-4 border-2 bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-800 focus:border-indigo-500 text-gray-900 dark:text-slate-200 transition-all outline-none text-sm italic"
                  placeholder="Feedback..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleCentralUpdate}
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save size={20} />}
              {isSaving ? 'Synchronizing...' : 'Update Current Day Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeWorkStatusTable;