'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Building2, Calendar, Clock, Trello, ChevronRight, Search, 
  CheckSquare, History, Timer, RotateCcw, MessageSquare, Send, X,
  Filter, PlusCircle, PlayCircle, ChevronLeft, RefreshCcw, Users,
  UserCircle2, Briefcase, TrendingUp, Award, Eye
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
    INTERFACES
───────────────────────────────────────────────────────── */
interface FlattenedTask {
  id: number;
  company: string;
  task: string;
  status: string;
  employeeName: string;
  employeeId: number;
  date: string;
  updatedAt?: string;
  managerComment?: string;
  commentHistory?: any[];
}

interface TaskManagementProps {
  allTasks: FlattenedTask[]; 
  currentUser: any;
  onUpdateStatus: (id: number, status: string, comment?: string) => Promise<boolean>;
  onMonthChange?: (month: number, year: number) => void;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

/* ─────────────────────────────────────────────────────────
    EMPLOYEE PROFILE MODAL (opens on clicking employee chip)
    Shows: employee's tasks for selected month, stats
───────────────────────────────────────────────────────── */
interface EmployeeProfileModalProps {
  employeeName: string;
  employeeId: number;
  companyFilter: string;
  tasks: FlattenedTask[];
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onTaskClick: (task: FlattenedTask) => void;
}

const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employeeName, employeeId, companyFilter, tasks, selectedMonth, selectedYear, onClose, onTaskClick
}) => {
  const employeeTasks = useMemo(() => {
    return tasks.filter(t => {
      const taskDate = new Date(t.date);
      const monthMatch = taskDate.getMonth() === selectedMonth && taskDate.getFullYear() === selectedYear;
      const empMatch = Number(t.employeeId) === Number(employeeId);
      const compMatch = companyFilter === 'all' || t.company === companyFilter;
      return monthMatch && empMatch && compMatch;
    });
  }, [tasks, employeeId, selectedMonth, selectedYear, companyFilter]);

  const stats = useMemo(() => {
    const assigned = employeeTasks.filter(t => t.status?.toUpperCase() === 'ASSIGNED').length;
    const inProgress = employeeTasks.filter(t => t.status?.toUpperCase() === 'IN_PROGRESS').length;
    const completed = employeeTasks.filter(t => t.status?.toUpperCase() === 'COMPLETED').length;
    const total = employeeTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { assigned, inProgress, completed, total, completionRate };
  }, [employeeTasks]);

  const initials = employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-8 text-white">
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white shadow-lg">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{employeeName}</h2>
              <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">
                {companyFilter !== 'all' ? companyFilter : 'All Companies'}
              </p>
              <p className="text-indigo-300 text-[9px] font-bold uppercase mt-0.5">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 mt-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-white/20' },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-400/30' },
              { label: 'Done', value: stats.completed, color: 'bg-emerald-400/30' },
            ].map(s => (
              <div key={s.label} className={`flex-1 ${s.color} rounded-xl p-3 text-center border border-white/10`}>
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-indigo-200 mt-0.5">{s.label}</div>
              </div>
            ))}
            <div className="flex-1 bg-amber-400/20 rounded-xl p-3 text-center border border-white/10">
              <div className="text-2xl font-black">{stats.completionRate}%</div>
              <div className="text-[8px] font-bold uppercase tracking-wider text-indigo-200 mt-0.5">Rate</div>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
            Tasks this month
          </p>
          {employeeTasks.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
              <Briefcase size={28} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">No tasks this month</span>
            </div>
          ) : employeeTasks.map(task => {
            const statusColors: Record<string, string> = {
              ASSIGNED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            };
            const s = task.status?.toUpperCase() || 'ASSIGNED';
            return (
              <button
                key={task.id}
                onClick={() => { onClose(); onTaskClick(task); }}
                className="w-full text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 p-4 rounded-2xl transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                    <Building2 size={11} /> {task.company}
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusColors[s] || statusColors['ASSIGNED']}`}>
                    {s.replace('_', ' ')}
                  </span>
                </div>
                <div
                  className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: task.task }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">ID #{task.id}</span>
                  <span className="text-[8px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Eye size={10}/> View details
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
    MAIN COMPONENT
───────────────────────────────────────────────────────── */
const TaskManagement: React.FC<TaskManagementProps> = ({ allTasks, currentUser, onUpdateStatus, onMonthChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<FlattenedTask | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Employee profile modal state
  const [profileEmployee, setProfileEmployee] = useState<{ id: number; name: string } | null>(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const handlePrevMonth = () => {
    let newMonth: number;
    let newYear: number;
    if (selectedMonth === 0) {
      newMonth = 11;
      newYear = selectedYear - 1;
    } else {
      newMonth = selectedMonth - 1;
      newYear = selectedYear;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    onMonthChange?.(newMonth + 1, newYear);
  };

  const handleNextMonth = () => {
    const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
    if (isCurrentMonth) return;
    let newMonth: number;
    let newYear: number;
    if (selectedMonth === 11) {
      newMonth = 0;
      newYear = selectedYear + 1;
    } else {
      newMonth = selectedMonth + 1;
      newYear = selectedYear;
    }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    onMonthChange?.(newMonth + 1, newYear);
  };

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const monthFilteredTasks = useMemo(() => {
    if (!allTasks) return [];
    if (onMonthChange) return allTasks; // server handles month filtering
    return allTasks.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allTasks, selectedMonth, selectedYear, onMonthChange]);

  /* ── Always filter allTasks by month client-side (bypasses server-side user filtering) ── */
  const allTasksInMonth = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allTasks, selectedMonth, selectedYear]);

  // Reset company filter if the selected company has no tasks in the new month
  useEffect(() => {
    if (filterCompany !== 'all') {
      const stillExists = allTasksInMonth.some(
        t => t.company?.trim().toLowerCase() === filterCompany?.trim().toLowerCase()
      );
      if (!stillExists) setFilterCompany('all');
    }
  }, [allTasksInMonth]);

  /* ── Companies that have at least one task in the selected month (full dataset) ── */
  const companies = useMemo(() => {
    const monthCompanies = Array.from(new Set(allTasksInMonth.map(t => t.company).filter(Boolean)));
    return ['all', ...monthCompanies];
  }, [allTasksInMonth]);

  /* ── All employees for a company in the selected month — no user-based filtering ── */
  const currentCompanyEmployees = useMemo(() => {
    if (filterCompany === 'all') return [];
    const employeesMap = new Map<number, string>();
    allTasksInMonth.forEach(t => {
      if (t.company?.trim().toLowerCase() === filterCompany?.trim().toLowerCase()) {
        employeesMap.set(Number(t.employeeId), t.employeeName);
      }
    });
    return Array.from(employeesMap.entries()).map(([id, name]) => ({ id, name }));
  }, [allTasksInMonth, filterCompany]);

  /* ── Main visible tasks (role + search + company + month) ── */
  const filteredTasks = useMemo(() => {
    return monthFilteredTasks.filter(t => {
      const isManager = currentUser.role === 'MANAGER';
      const isOwner = Number(t.employeeId) === Number(currentUser.id);

      if (!isManager) {
        const hasTaskInThisCompany = monthFilteredTasks.some(
          (item) =>
            item.company?.trim().toLowerCase() === t.company?.trim().toLowerCase() &&
            Number(item.employeeId) === Number(currentUser.id)
        );
        if (!isOwner && !hasTaskInThisCompany) return false;
      }

      const companyMatch = filterCompany === 'all' || t.company === filterCompany;
      const searchLower = searchQuery.toLowerCase();
      const taskMatch = t.task.toLowerCase().includes(searchLower);
      const employeeMatch = t.employeeName.toLowerCase().includes(searchLower);
      const searchMatch = isManager ? (taskMatch || employeeMatch) : taskMatch;

      return companyMatch && searchMatch;
    });
  }, [monthFilteredTasks, filterCompany, currentUser, searchQuery]);

  const getCollaborators = (companyName: string, currentEmployeeId: number) => {
    if (!monthFilteredTasks || monthFilteredTasks.length === 0) return [];
    const collaboratorsMap = new Map<number, string>();
    monthFilteredTasks.forEach((t) => {
      const sameCompany = t.company?.trim().toLowerCase() === companyName?.trim().toLowerCase();
      const isDifferentUser = Number(t.employeeId) !== Number(currentEmployeeId);
      if (sameCompany && isDifferentUser) {
        collaboratorsMap.set(Number(t.employeeId), t.employeeName);
      }
    });
    return Array.from(collaboratorsMap.values());
  };

  const columns = [
    { id: 'ASSIGNED', label: 'Assigned', icon: <Clock size={16} />, color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/50 dark:border-amber-400/30', bg: 'bg-amber-50/90 dark:bg-slate-800/90', dot: 'bg-amber-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', icon: <PlayCircle size={16} />, color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/50 dark:border-blue-400/30', bg: 'bg-blue-50/90 dark:bg-slate-800/90', dot: 'bg-blue-500' },
    { id: 'COMPLETED', label: 'Completed', icon: <CheckSquare size={16} />, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/50 dark:border-emerald-400/30', bg: 'bg-emerald-50/90 dark:bg-slate-800/90', dot: 'bg-emerald-500' },
  ];

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(date);
  };

  const handleStatusSubmit = async (status: string) => {
    if (!selectedTask) return;
    setIsUpdating(true);
    const finalComment = commentInput.trim() !== '' ? commentInput : selectedTask.managerComment;
    try {
        const success = await onUpdateStatus(selectedTask.id, status, finalComment);
        if (success) {
          setSelectedTask(null);
          setCommentInput('');
          setShowCommentBox(false);
        }
    } finally {
        setIsUpdating(false);
    }
  };

  /* ─────────────────────────────────────────────────────────
      AVATAR COLOR PALETTE (consistent per name)
  ───────────────────────────────────────────────────────── */
  const avatarColors = [
    'bg-indigo-600','bg-violet-600','bg-rose-500','bg-emerald-600',
    'bg-amber-500','bg-cyan-600','bg-fuchsia-600','bg-teal-600',
  ];
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 px-4 md:px-0">
      
      {/* ─── MAIN HEADER ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Trello size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Workflow Board</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <Timer size={12} className="text-indigo-500" /> Live {currentUser.role === 'MANAGER' ? 'Team' : 'My'} Pipeline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder={currentUser.role === 'MANAGER' ? "Search tasks or employees..." : "Search tasks..."} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:border-indigo-500 dark:text-slate-200 transition-all" 
            />
          </div>
          <div className="relative flex-1 lg:flex-none lg:w-44">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-[10px] font-black uppercase outline-none focus:border-indigo-500 dark:text-slate-200 appearance-none cursor-pointer">
              {companies.map(c => <option key={c} value={c}>{c === 'all' ? 'All Companies' : c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-2 py-1.5">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ChevronLeft size={14} className="text-slate-500 dark:text-slate-400" />
            </button>
            <div className="flex items-center gap-1.5 px-2 min-w-[120px] justify-center">
              <Calendar size={13} className="text-indigo-500 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {MONTH_NAMES[selectedMonth].slice(0, 3)} {selectedYear}
              </span>
            </div>
            <button onClick={handleNextMonth} disabled={isCurrentMonth}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={14} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── REDESIGNED TEAM SUB-HEADER (clickable employee cards) ─── */}
      {filterCompany !== 'all' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[2rem] shadow-sm animate-in slide-in-from-top-2 duration-300">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 rounded-xl">
                <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{filterCompany}</h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {currentCompanyEmployees.length} member{currentCompanyEmployees.length !== 1 ? 's' : ''} · {MONTH_NAMES[selectedMonth]} {selectedYear}
                </p>
              </div>
            </div>
            {currentUser.role === 'MANAGER' && (
              <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                <TrendingUp size={11} className="text-indigo-500" />
                <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">
                  {allTasksInMonth.filter(t => t.company === filterCompany && t.status?.toUpperCase() === 'COMPLETED').length} completed
                </span>
              </div>
            )}
          </div>

          {/* Employee cards — clickable */}
          <div className="flex flex-wrap gap-3">
            {currentCompanyEmployees.map(({ id, name }) => {
              const empTasks = allTasksInMonth.filter(t => t.company === filterCompany && Number(t.employeeId) === id);
              const completed = empTasks.filter(t => t.status?.toUpperCase() === 'COMPLETED').length;
              const inProgress = empTasks.filter(t => t.status?.toUpperCase() === 'IN_PROGRESS').length;
              const total = empTasks.length;
              const isSelf = Number(id) === Number(currentUser.id);
              const avatarBg = getAvatarColor(name);
              const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <button
                  key={id}
                  onClick={() => setProfileEmployee({ id, name })}
                  className={`group flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer min-w-[180px]
                    ${isSelf
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                    }`}
                >
                  {/* Avatar */}
                  <div className={`relative w-11 h-11 rounded-xl ${avatarBg} flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0`}>
                    {initials}
                    {inProgress > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    )}
                    {inProgress === 0 && completed === total && total > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    )}
                  </div>

                  {/* Name + task counts */}
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-black tracking-tight leading-tight ${isSelf ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-100'}`}>
                        {name}
                      </span>
                      {isSelf && (
                        <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{total} task{total !== 1 ? 's' : ''}</span>
                      {completed > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40">✓ {completed} done</span>
                      )}
                      {inProgress > 0 && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40">▶ {inProgress}</span>
                      )}
                      {total === 0 && (
                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 italic">No tasks this month</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow hint on hover */}
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Hint text */}
          <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 flex items-center gap-1.5">
            <Eye size={10}/> Click a member to view their tasks this month
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-2 rounded-full">
          <Calendar size={13} className="text-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>
          {isCurrentMonth && (
            <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-full tracking-wider">
              Current
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* KANBAN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pb-20">
        {columns.map((col) => {
          const tasksInCol = filteredTasks.filter(t => (t.status?.toUpperCase() || 'ASSIGNED') === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className={`flex items-center gap-2 font-black text-[11px] uppercase tracking-widest ${col.color}`}>{col.icon} {col.label}</div>
                <span className="bg-white dark:bg-slate-700 px-3 py-0.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-600 shadow-sm">{tasksInCol.length}</span>
              </div>
              <div className="space-y-4">
                {tasksInCol.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem]">
                    <CheckSquare size={24} strokeWidth={1.5} />
                    <span className="text-[9px] font-black uppercase tracking-widest">No tasks</span>
                  </div>
                ) : tasksInCol.map((task) => {
                  const collaborators = getCollaborators(task.company, task.employeeId);
                  return (
                    <div key={task.id} onClick={() => setSelectedTask(task)}
                      className={`group ${col.bg} p-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-l-[8px] ${col.border}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Company Name:</span>
                          <div className="flex items-center gap-1.5"><Building2 size={12} className="text-indigo-500" /><span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate max-w-[150px]">{task.company}</span></div>
                        </div>
                        <div className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-sm animate-pulse`} />
                      </div>
                      <div className="mb-4">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Assigned Task:</span>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: task.task }} />
                      </div>

                      <div className="mb-4">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Team Assigned</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-md text-[8px] font-bold uppercase">
                            <span className="w-3 h-3 flex items-center justify-center text-[7px]">{task.employeeName.charAt(0)}</span>
                            {task.employeeName.split(' ')[0]} {Number(task.employeeId) === Number(currentUser.id) && <span className="opacity-70">(You)</span>}
                          </div>
                          {collaborators.map((name, i) => (
                            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-[8px] font-bold uppercase">
                              <span className="w-3 h-3 flex items-center justify-center text-[7px]">{name.charAt(0)}</span>
                              {name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-[9px] font-black border border-slate-100 dark:border-slate-600 dark:text-white">{task.employeeName.charAt(0)}</div>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{task.employeeName.split(' ')[0]}</span>
                        </div>
                        {task.managerComment && <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg"><MessageSquare size={12} className="text-indigo-600 dark:text-indigo-400" /></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col rounded-l-[3rem] border-l border-slate-100 dark:border-slate-800">
            
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><Trello size={20}/></div>
                <div>
                  <h2 className="font-black uppercase tracking-tighter text-xl leading-none dark:text-white">Task Details</h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1.5 tracking-widest">ID: #{selectedTask.id}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedTask(null); setShowCommentBox(false); setCommentInput(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-white"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              <section className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company Name:</span>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase text-sm"><Building2 size={16}/> {selectedTask.company}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Assigned Task:</span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 leading-relaxed shadow-inner" dangerouslySetInnerHTML={{ __html: selectedTask.task }} />
                </div>
              </section>

              <section className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest"><Users size={14}/> Team on this Company</h3>
                 <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 px-3 py-2 rounded-xl">
                       <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black">{selectedTask.employeeName.charAt(0)}</div>
                       <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-tighter">{selectedTask.employeeName} (Assignee)</span>
                    </div>
                    {getCollaborators(selectedTask.company, selectedTask.employeeId).map((name, idx) => (
                       <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl">
                          <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[8px] font-black">{name.charAt(0)}</div>
                          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{name}</span>
                       </div>
                    ))}
                 </div>
              </section>

              {selectedTask.managerComment && (
                <section className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-2 tracking-widest"><MessageSquare size={14}/> Current Feedback</h3>
                  <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/50 rounded-[2rem] italic text-xs font-bold text-rose-900 dark:text-rose-200 shadow-sm">"{selectedTask.managerComment}"</div>
                </section>
              )}

              <section className="space-y-4 pb-10">
                <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest"><History size={14}/> Activity Timeline</h3>
                <div className="space-y-8 border-l-4 border-slate-100 dark:border-slate-800 ml-3 pl-8">
                  {selectedTask.updatedAt && (
                    <div className="relative">
                      <div className="absolute -left-[38px] top-1 w-5 h-5 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900 shadow-md" />
                      <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">Latest Pipeline Move</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{formatTimestamp(selectedTask.updatedAt)}</p>
                    </div>
                  )}
                  {selectedTask.commentHistory && Array.isArray(selectedTask.commentHistory) && 
                    [...selectedTask.commentHistory].reverse().filter((entry, idx, self) => idx === 0 || entry.comment !== self[idx - 1].comment).map((entry: any, i: number) => {
                        const s = entry.status?.toUpperCase();
                        const badgeStyle = s === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : s === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600';
                        return (
                          <div key={i} className="relative">
                             <div className={`absolute -left-[38px] top-1 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 shadow-md ${s === 'COMPLETED' ? 'bg-emerald-500' : s === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                             <p className={`text-[11px] font-black uppercase tracking-widest ${s === 'COMPLETED' ? 'text-emerald-600' : s === 'IN_PROGRESS' ? 'text-blue-600' : 'text-amber-600'}`}>{s.replace('_', ' ')} Move</p>
                             <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-bold italic text-slate-700 dark:text-slate-300">"{entry.comment}"</p>
                                <div className="mt-2 flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase">
                                   <span className={`px-2 py-0.5 rounded ${badgeStyle}`}>Origin: {s}</span>
                                   <span>{formatTimestamp(entry.timestamp)}</span>
                                </div>
                             </div>
                          </div>
                        );
                  })}
                  <div className="relative">
                    <div className="absolute -left-[38px] top-1 w-5 h-5 rounded-full bg-amber-500 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">Creation Date</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{formatTimestamp(selectedTask.date)}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* ACTION FOOTER */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 rounded-bl-[3rem]">
              {currentUser.role === 'MANAGER' ? (
                <div className="space-y-4">
                  {showCommentBox ? (
                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1">
                         <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">New Instructions:</span>
                         <button onClick={() => { setShowCommentBox(false); setCommentInput(''); }} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-500">Cancel</button>
                       </div>
                       <textarea placeholder="Type your feedback here..." value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                         className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500 min-h-[100px]" />
                    </div>
                  ) : (
                    <button onClick={() => setShowCommentBox(true)} className="w-full py-4 border-2 border-dashed border-indigo-300 dark:border-indigo-900 rounded-2xl text-[10px] font-black uppercase text-indigo-500 flex items-center justify-center gap-2">
                       <PlusCircle size={14}/> Add Feedback
                    </button>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button onClick={() => handleStatusSubmit('ASSIGNED')} disabled={isUpdating} className="flex-1 bg-white border-2 border-rose-100 text-rose-500 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-50">
                      {isUpdating ? <RefreshCcw size={14} className="animate-spin" /> : <RotateCcw size={14}/>} {selectedTask.status === 'IN_PROGRESS' ? 'Return to Queue' : 'Request Revision'}
                    </button>
                    <button onClick={() => handleStatusSubmit(selectedTask.status === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED')} disabled={isUpdating} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50">
                      {isUpdating ? <RefreshCcw size={14} className="animate-spin" /> : <Send size={14}/>} {selectedTask.status === 'ASSIGNED' ? 'Begin Progress' : 'Confirm Completion'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {Number(selectedTask.employeeId) === Number(currentUser.id) ? (
                    <>
                      {selectedTask.status.toUpperCase() !== 'COMPLETED' && (
                        <button onClick={() => handleStatusSubmit(selectedTask.status.toUpperCase() === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED')} disabled={isUpdating} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase flex items-center justify-center gap-3 disabled:opacity-50">
                          {isUpdating ? <RefreshCcw size={18} className="animate-spin" /> : <PlayCircle size={18} />} Move to {selectedTask.status.toUpperCase() === 'ASSIGNED' ? 'In Progress' : 'Completed'}
                        </button>
                      )}
                      {selectedTask.status.toUpperCase() !== 'ASSIGNED' && (
                        <button onClick={() => handleStatusSubmit(selectedTask.status.toUpperCase() === 'COMPLETED' ? 'IN_PROGRESS' : 'ASSIGNED')} disabled={isUpdating} className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 text-slate-500 py-4 rounded-[2rem] text-[10px] font-black uppercase flex items-center justify-center gap-3 disabled:opacity-50">
                          {isUpdating ? <RefreshCcw size={16} className="animate-spin" /> : <RotateCcw size={16}/>} Revert to {selectedTask.status.toUpperCase() === 'COMPLETED' ? 'In Progress' : 'Assigned'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="py-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                      <p className="text-[10px] font-black uppercase text-slate-400">Viewing Teammate's Task</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMPLOYEE PROFILE MODAL */}
      {profileEmployee && (
        <EmployeeProfileModal
          employeeName={profileEmployee.name}
          employeeId={profileEmployee.id}
          companyFilter={filterCompany}
          tasks={allTasks}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={() => setProfileEmployee(null)}
          onTaskClick={(task) => {
            setProfileEmployee(null);
            setSelectedTask(task);
          }}
        />
      )}
    </div>
  );
};

export default TaskManagement;