"use client";
import React, { useState, forwardRef, useImperativeHandle, useMemo } from "react";
import ReactDOM from "react-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, isSameDay, isBefore, startOfDay } from "date-fns";
import { X, Calendar as CalendarIcon, Save, ListTodo, Clock, RefreshCcw, Edit3, MessageSquare, CheckCircle2, Sparkles, Info, AlertCircle, Bookmark } from "lucide-react";
import { getAuthToken } from "@/lib/api/api";
import { canEditDate, isFutureDate } from "@/utils/date";
import { getHoliday } from "@/lib/holidays"; 
import useSWR from "swr";
import dynamic from 'next/dynamic';
import MonthOverview from "@/components/MonthOverview";

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-gray-50 dark:bg-slate-800 animate-pulse rounded-xl border border-gray-200 dark:border-slate-700" />
});
import 'react-quill/dist/quill.snow.css';

if (typeof window !== "undefined") {
  // @ts-ignore
  if (!ReactDOM.findDOMNode) {
    // @ts-ignore
    ReactDOM.findDOMNode = (instance) => {
      return instance instanceof HTMLElement ? instance : null;
    };
  }
}

interface AssignedTask {
  id?: number;
  company: string;
  task: string;
  isDone: boolean;
  assignedAt?: string;
  completedAt?: string; 
  status?: string;
}

interface Leave {
  id: number;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  reason: string;
  isOptional?: boolean; 
}

interface TaskData {
  content: string;
  managerComment: string;
  assignedTasks: AssignedTask[]; 
}

const fetcher = async (url: string) => {
  const token = getAuthToken();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
};

const isDateInLeave = (d: string, l: any): boolean =>
  l.status === 'APPROVED' &&
  d >= format(new Date(l.startDate), "yyyy-MM-dd") &&
  d <= format(new Date(l.endDate), "yyyy-MM-dd");

const isOptionalLeave = (l: any): boolean => {
  const byFlag = l.isOptional === true;
  const byType = typeof l.type === 'string' && l.type.toUpperCase() === 'OPTIONAL';
  const byHolidayName = typeof l.holidayName === 'string' && l.holidayName.trim() !== '';
  return byFlag || byType || byHolidayName;
};

export const EmployeeCalendar = forwardRef(({ viewOnly = false, employeeId }: { viewOnly?: boolean; employeeId?: number }, ref) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentPointers, setCurrentPointers] = useState("");
  const [currentComment, setCurrentComment] = useState("");
  const [currentAssignedTasks, setCurrentAssignedTasks] = useState<AssignedTask[]>([]); 
  const [isSaving, setIsSaving] = useState(false);
  const [isMissingTask, setIsMissingTask] = useState(false); 
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  const url = employeeId ? `/api/tasks?userId=${employeeId}` : "/api/tasks";
  const { data: rawData, mutate, isValidating } = useSWR(url, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    keepPreviousData: true,
    dedupingInterval: 2000 
  });

  const { tasks, leaves } = useMemo(() => {
    const taskMap: Record<string, TaskData> = {};
    const leaveList: Leave[] = [];
    if (!rawData) return { tasks: taskMap, leaves: leaveList };

    const dataRoot = Array.isArray(rawData) ? rawData[0] : rawData;
    const taskSource = dataRoot?.tasks || (Array.isArray(rawData) ? rawData : []);
    const leaveSource = dataRoot?.leaves || [];

    taskSource.forEach((t: any) => {
      const dateKey = format(new Date(t.date), "yyyy-MM-dd");
      taskMap[dateKey] = {
        content: t.content || "",
        managerComment: t.managerComment || "",
        assignedTasks: t.assignedTasks || []
      };
    });
    return { tasks: taskMap, leaves: leaveSource };
  }, [rawData]);

  const quillModules = {
    toolbar: [['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']],
    clipboard: { matchVisual: false }
  };

  useImperativeHandle(ref, () => ({
    openToday: () => { handleDayClick(new Date()); }
  }));

  const formatAssignedAt = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch (error) { return ""; }
  };

  // ✅ Change 3: Allow clicking ANY day — removed future date restriction
  const handleDayClick = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const holiday = getHoliday(dateKey);
    const approvedLeave = leaves.find((l: any) => isDateInLeave(dateKey, l));

    const existingDay = tasks[dateKey];
    const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
    const hasRealContent = existingDay?.content && existingDay.content !== '<p><br></p>';
    
    setIsMissingTask(isPast && !hasRealContent && !viewOnly && !holiday && !approvedLeave);
    setSelectedDate(date);
    setSelectedLeave(approvedLeave || null);
    setCurrentPointers(existingDay?.content || "");
    setCurrentComment(existingDay?.managerComment || "");
    setCurrentAssignedTasks(existingDay?.assignedTasks || []); 
    setShowModal(true);
  };

  const performSave = async (assignedToSave?: AssignedTask[]) => {
    setIsSaving(true);
    const token = getAuthToken();
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          content: viewOnly ? undefined : currentPointers,
          assignedTasks: assignedToSave || currentAssignedTasks, 
          employeeId: employeeId
        }),
      });
      if (res.ok) { await mutate(); }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAssignedTask = async (index: number) => {
    // ✅ Change 7: Restrict task toggle to today only
    if (viewOnly || !isSelectedToday) return; 
    const now = new Date().toISOString();
    const updatedTasks = currentAssignedTasks.map((t, i) => 
      i === index ? { ...t, isDone: !t.isDone, completedAt: !t.isDone ? now : undefined } : t
    );
    setCurrentAssignedTasks(updatedTasks);
    await performSave(updatedTasks);
  };

  const handleMarkAllCompleted = async () => {
    if (viewOnly || !isSelectedToday) return;
    const now = new Date().toISOString();
    const updatedTasks = currentAssignedTasks.map(t => ({ ...t, isDone: true, completedAt: t.isDone ? t.completedAt : now }));
    setCurrentAssignedTasks(updatedTasks);
    await performSave(updatedTasks);
  };

  const handleSave = async () => {
    // ✅ Change 5: Only allow save for today (or viewOnly)
    if (!viewOnly && !isSelectedToday) return;
    await performSave();
    setShowModal(false);
  };

  const isSelectedToday = isSameDay(selectedDate, new Date());
  const selectedHoliday = getHoliday(format(selectedDate, "yyyy-MM-dd"));
  // ✅ Change 6: Removed isLoggingDisabled — holidays no longer block logging

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const isOptionalHolidayUsed = selectedHoliday?.type === 'OPTIONAL' &&
    leaves.some((l: any) => isDateInLeave(selectedDateKey, l) && isOptionalLeave(l));

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full max-w-7xl mx-auto p-2 sm:p-4">
      {/* LEFT SIDE: CALENDAR */}
      <div className="relative w-full lg:w-1/2 min-w-0 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 transition-colors duration-300 shadow-sm overflow-hidden">
        {isValidating && (
          <div className="absolute top-4 right-4 z-10">
            <RefreshCcw size={16} className="animate-spin text-indigo-500 opacity-60" />
          </div>
        )}

        <style jsx global>{`
          .ql-editor * { color: inherit !important; background-color: transparent !important; font-family: inherit !important; }

          /* ── Calendar base ── */
          .react-calendar { background: transparent; border: none; font-family: inherit; width: 100% !important; max-width: 100% !important; box-sizing: border-box; }

          /* ── Navigation: full-width grid layout ── */
          /* ✅ Change 1: Fixed month selector to proper full width */
          .react-calendar__navigation {
            display: grid !important;
            grid-template-columns: 40px 1fr 40px !important;
            align-items: center !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin-bottom: 12px !important;
          }
          .react-calendar__navigation button {
            min-width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 16px !important;
            background: transparent !important;
            border: none !important;
            border-radius: 8px !important;
            cursor: pointer !important;
          }
          .react-calendar__navigation__label {
            width: 100% !important;
            text-align: center !important;
            font-weight: 900 !important;
            font-size: 16px !important;
            white-space: nowrap !important;
          }
          .dark .react-calendar__navigation button:enabled:hover,
          .dark .react-calendar__navigation button:enabled:focus {
            background-color: #1e293b !important;
          }
          .dark .react-calendar__navigation button { color: #f8fafc !important; }

          /* ── Month grid ── */
          .react-calendar__month-view { width: 100% !important; }
          .react-calendar__month-view__days { display: grid !important; grid-template-columns: repeat(7, 1fr) !important; width: 100% !important; }
          .react-calendar__month-view__weekdays { display: grid !important; grid-template-columns: repeat(7, 1fr) !important; width: 100% !important; }
          .react-calendar__month-view__weekdays__weekday { text-align: center !important; font-size: clamp(7px, 1.6vw, 11px) !important; overflow: hidden !important; }
          .react-calendar__month-view__weekdays__weekday abbr { text-decoration: none !important; }

          /* ── Tiles ── */
          .react-calendar__tile {
            position: relative !important;
            aspect-ratio: 1 / 1 !important;
            border-radius: 12px !important;
            margin: 2px 0 !important;
            font-weight: 700;
            color: #1e293b;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: visible !important;
            background: transparent !important;
            z-index: 0;
            min-width: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          .dark .react-calendar__tile { color: #f8fafc; }
          .react-calendar__tile abbr {
            position: relative !important;
            z-index: 3 !important;
            pointer-events: none;
            color: inherit;
            font-size: clamp(9px, 2vw, 13px);
          }
          .react-calendar__tile::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 10px;
            z-index: 1;
            background: transparent;
            transition: background 0.15s ease;
          }

          /* ── Tile states ── */
          .tile-today-focus { color: #2563eb !important; }
          .tile-today-focus::before { background: #ffffff !important; border: 2px solid #2563eb !important; border-radius: 10px; }
          .dark .tile-today-focus { color: #3b82f6 !important; }
          .dark .tile-today-focus::before { background: #0f172a !important; border: 2px solid #3b82f6 !important; }

          .task-added { color: #ffffff !important; }
          .task-added::before { background: #2563eb !important; }

          .task-missing { color: #ffffff !important; }
          .task-missing::before { background: #ef4444 !important; }

          .holiday-fixed::before { background: #94a3b8 !important; opacity: 0.4; }
          .holiday-fixed abbr { color: #475569 !important; font-style: italic; }
          .dark .holiday-fixed abbr { color: #94a3b8 !important; }

          .holiday-optional-approved::before { border: 2px dashed #ef4444 !important; background: rgba(239, 68, 68, 0.05) !important; }
          .holiday-optional-approved abbr { color: #ef4444 !important; }

          .holiday-optional::before { border: 1.5px dashed #6366f1 !important; background: rgba(99, 102, 241, 0.05) !important; }
          .holiday-optional abbr { color: #6366f1 !important; }
          .dark .holiday-optional abbr { color: #818cf8 !important; }

          /* ── Leave: border only, bg transparent, show date ── */
          .leave-approved::before {
            background: transparent !important;
            border: 2px solid #ef4444 !important;
            border-radius: 10px !important;
          }
          .leave-approved abbr { color: #ef4444 !important; }
          .dark .leave-approved abbr { color: #f87171 !important; }

          /* ── Thin scrollbar utility ── */
          .scrollbar-thin { scrollbar-width: thin; }
          .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
          .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
          .scrollbar-thin::-webkit-scrollbar-thumb { border-radius: 99px; background: #c7d2fe; }
          .dark .scrollbar-thin::-webkit-scrollbar-thumb { background: #475569; }
          .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #a5b4fc; }
          .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `}
        </style>

        <div className="flex justify-center w-full overflow-hidden">
          <Calendar
            onClickDay={handleDayClick}
            onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate || new Date())}
            // {/* ✅ Change 2: Removed tileDisabled entirely — no days are disabled */}
            prev2Label={null}
            next2Label={null}
            tileClassName={({ date, view }) => {
              if (view !== "month") return "";
              const key = format(date, "yyyy-MM-dd");
              const taskData = tasks[key];
              const holiday = getHoliday(key); 
              const approvedLeave = leaves.find((l: any) => isDateInLeave(key, l));
              const optionalHolidayLeave = leaves.find((l: any) => isDateInLeave(key, l) && isOptionalLeave(l));
              
              const hasTask = taskData?.content && taskData.content !== '<p><br></p>';
              const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
              const isToday = isSameDay(date, new Date());
              const classes: string[] = [];
              
              if (hasTask) {
                classes.push("task-added");
              } else if (isToday) {
                classes.push("tile-today-focus");
              } else if (holiday?.type === 'OPTIONAL' && optionalHolidayLeave) {
                classes.push("holiday-optional-approved");
              } else if (approvedLeave) {
                classes.push("leave-approved");
              } else if (holiday) {
                classes.push(holiday.type === 'FIXED' ? "holiday-fixed" : "holiday-optional");
              } else if (isPast && !viewOnly && Object.keys(tasks).length > 0) {
                classes.push("task-missing");
              }
              return classes.join(" ");
            }}
            formatDay={(locale, date) => {
               const key = format(date, "yyyy-MM-dd");
               const holiday = getHoliday(key);
               const optionalHolidayLeave = leaves.find((l: any) => isDateInLeave(key, l) && isOptionalLeave(l));
               if (holiday?.type === 'OPTIONAL' && optionalHolidayLeave) return "OH";
               if (holiday) return holiday.type === 'OPTIONAL' ? "OH" : "H";
               return date.getDate().toString();
            }}
            className="minimal-white-calendar-wide"
          />
        </div>

        <div className="mt-8 flex flex-wrap justify-start gap-x-4 sm:gap-x-6 gap-y-3 border-t border-gray-100 dark:border-slate-800 pt-6">
          <Legend color="bg-blue-600" label="Logged" isFilled />
          <Legend color="bg-red-500" label="Missing" isFilled />
          <Legend color="border-red-500 border-2" label="Leave" />
          <Legend color="bg-slate-400 opacity-50" label="Holiday" isFilled />
          <Legend color="border-indigo-500 border-dashed border-2" label="Optional" />
        </div>
      </div>

      {/* RIGHT SIDE: MONTH OVERVIEW */}
      <div className="w-full lg:w-1/2 min-w-0 flex">
        <MonthOverview 
          tasks={tasks} 
          leaves={leaves} 
          currentMonth={activeStartDate} 
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-7xl rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/20 flex flex-col
            overflow-y-auto max-h-[95vh]
            lg:overflow-hidden lg:max-h-[92vh]">
            
            <div className={`p-4 sm:p-8 text-white flex-shrink-0 flex items-center justify-between transition-colors duration-500 sticky top-0 z-10 ${isOptionalHolidayUsed ? "bg-red-600" : isMissingTask ? "bg-red-600" : "bg-indigo-600"}`}>
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                  <CalendarIcon className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight truncate uppercase italic">{format(selectedDate, "EEEE, MMM dd")}</h3>
                  <p className="text-white/70 text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1">
                    {isOptionalHolidayUsed ? "Used Optional Holiday" : selectedHoliday ? `${selectedHoliday.type} Holiday (${selectedHoliday.isHalfDay ? 'Half-Day' : 'Full-Day'}): ${selectedHoliday.name}` : (selectedLeave ? `Approved Leave: ${selectedLeave.type}` : "Daily Record")}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-black/10 hover:bg-black/20 rounded-xl transition-all cursor-pointer shrink-0 ml-2"><X /></button>
            </div>
            
            <div className="p-4 sm:p-8 flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden">
              {isOptionalHolidayUsed && (
                <div className="mb-4 p-5 rounded-[1.5rem] bg-red-50 border-2 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 flex items-center gap-4 animate-in slide-in-from-top-4 flex-shrink-0">
                    <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shrink-0"><Sparkles size={24} /></div>
                    <div className="min-w-0">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600">Optional Quota Utilized</h4>
                       <p className="text-lg font-black text-slate-800 dark:text-red-100 uppercase tracking-tighter truncate">
                          {selectedHoliday?.name} — Approved Holiday
                       </p>
                    </div>
                </div>
              )}

              <div className={`grid gap-4 sm:gap-6 lg:flex-1 lg:min-h-0 ${currentAssignedTasks.length > 0 ? "grid-cols-1 lg:grid-cols-3 lg:h-full" : "grid-cols-1 lg:grid-cols-[1fr_380px] lg:h-full"}`}>

                {/* ── Task Queue ── */}
                {currentAssignedTasks.length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-indigo-100 dark:border-slate-700 flex flex-col space-y-4
                    h-[300px] sm:h-[360px] lg:h-full">
                    <div className="flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                        <h3 className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase italic">Queue</h3>
                      </div>
                      {!viewOnly && isSelectedToday && currentAssignedTasks.some(t => !t.isDone) && (
                        <button onClick={handleMarkAllCompleted} className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-200">Mark Done</button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1">
                      {currentAssignedTasks.map((t, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-sm">
                          <div className="flex items-start gap-3">
                            <input 
                              type="checkbox" 
                              checked={t.isDone} 
                              onChange={() => handleToggleAssignedTask(idx)}
                              disabled={viewOnly || !isSelectedToday}
                              className={`mt-1 h-5 w-5 rounded border-2 transition-colors cursor-pointer appearance-none checked:bg-emerald-500 checked:border-emerald-500 border-indigo-200 relative shrink-0 ${t.isDone ? 'bg-emerald-500' : 'bg-transparent'} after:content-['✓'] after:absolute after:text-white after:text-[10px] after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:font-bold ${t.isDone ? 'after:opacity-100' : 'after:opacity-0'}`} 
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[7px] sm:text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase truncate block w-fit">{t.company}</span>
                              <div className={`text-[10px] sm:text-[11px] mt-1.5 font-bold leading-snug break-words ${t.isDone ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-200'}`} dangerouslySetInnerHTML={{ __html: t.task }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Submission / Quill ── */}
                <div className="bg-gray-50 dark:bg-slate-800/30 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 dark:border-slate-800 flex flex-col
                  min-h-[360px] sm:min-h-[440px] lg:h-full lg:overflow-hidden">
                  <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex-shrink-0 flex justify-between items-center text-gray-400">
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">My Submission</h3>
                    {selectedLeave && (
                      <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-[8px] font-black uppercase border border-red-200 dark:border-red-800 tracking-widest">
                        {selectedLeave.type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {selectedLeave && (
                    <div className="mx-4 sm:mx-6 mb-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 overflow-hidden flex-shrink-0 animate-in slide-in-from-top-1">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100/60 dark:bg-red-900/30 border-b border-red-200 dark:border-red-900/50">
                        <Bookmark size={11} className="text-red-500 shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">Leave Type</span>
                        <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500 text-white">
                          {selectedLeave.status}
                        </span>
                      </div>
                      <div className="px-4 py-3 flex flex-col gap-1.5">
                        <p className="text-sm font-black uppercase tracking-tight text-red-700 dark:text-red-200">
                          {selectedLeave.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[9px] font-bold text-red-500/80 dark:text-red-400/70 uppercase tracking-widest">
                          {format(new Date(selectedLeave.startDate), "dd MMM yyyy")}
                          {selectedLeave.startDate !== selectedLeave.endDate && (
                            <> &rarr; {format(new Date(selectedLeave.endDate), "dd MMM yyyy")}</>
                          )}
                        </p>
                        {selectedLeave.reason && (
                          <p className="text-[10px] font-semibold text-red-600/70 dark:text-red-300/60 italic leading-snug mt-0.5">
                            &ldquo;{selectedLeave.reason}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* ✅ Change 4: Quill readOnly for non-today days, updated placeholder */}
                    <ReactQuill
                      theme="snow"
                      value={currentPointers}
                      onChange={setCurrentPointers}
                      modules={quillModules}
                      readOnly={viewOnly || !isSelectedToday}
                      placeholder={!isSelectedToday ? "You can only log tasks for today." : "Describe what you worked on today..."}
                      className="flex-1 flex flex-col overflow-hidden"
                    />
                  </div>
                </div>

                {/* ── Status / Feedback ── */}
                <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-amber-100 dark:border-amber-900/30 flex flex-col space-y-4
                  lg:h-full lg:overflow-y-auto scrollbar-thin">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <Edit3 size={18} />
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Status</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-100 dark:border-slate-700">
                    <label className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase block mb-1">Live Tracking</label>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-800 dark:text-slate-200">{selectedLeave ? `Approved ${selectedLeave.type}` : (currentPointers && currentPointers !== '<p><br></p>' ? "Logs Received" : "Pending Logs")}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                      <MessageSquare size={14} />
                      <label className="text-[9px] font-black uppercase tracking-widest">Feedback</label>
                    </div>
                    <div className={`w-full p-4 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] ${viewOnly ? "bg-orange-50 text-orange-900" : "bg-white text-gray-500 italic shadow-sm"}`}>{currentComment || "No notes yet..."}</div>
                  </div>
                  {/* ✅ Change 5: Save button only shown for today (or viewOnly) — isLoggingDisabled removed */}
                  {((!viewOnly && isSelectedToday) || viewOnly) && (
                    <button onClick={handleSave} disabled={isSaving} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl dark:shadow-none flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 ${viewOnly ? "bg-orange-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>{isSaving ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16} />} {isSaving ? "Syncing..." : viewOnly ? "Update Notes" : "Save Log"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

EmployeeCalendar.displayName = "EmployeeCalendar";

const Legend = ({ color, label, isFilled = false }: { color: string; label: string; isFilled?: boolean }) => (
  <div className="flex items-center gap-2 text-left">
    <span className={`w-2.5 h-2.5 rounded-full ${color} ${!isFilled ? 'bg-transparent' : ''} shrink-0`} />
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
  </div>
);