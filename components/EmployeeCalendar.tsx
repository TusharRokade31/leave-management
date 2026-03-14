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

export const EmployeeCalendar = forwardRef(({ viewOnly = false, employeeId }: { viewOnly?: boolean; employeeId?: number }, ref) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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

  const handleDayClick = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const holiday = getHoliday(dateKey);
    const approvedLeave = leaves.find((l: any) => {
        const d = format(date, "yyyy-MM-dd");
        const start = format(new Date(l.startDate), "yyyy-MM-dd");
        const end = format(new Date(l.endDate), "yyyy-MM-dd");
        return l.status === 'APPROVED' && d >= start && d <= end;
    });

    if (!viewOnly && isFutureDate(date) && !holiday && !approvedLeave) return;

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
    if (!viewOnly && !canEditDate(selectedDate)) return;
    await performSave();
    setShowModal(false);
  };

  const isSelectedToday = isSameDay(selectedDate, new Date());
  const selectedHoliday = getHoliday(format(selectedDate, "yyyy-MM-dd"));
  const isLoggingDisabled = selectedHoliday?.type === 'FIXED' && !selectedHoliday?.isHalfDay;
  const isOptionalHolidayUsed = selectedHoliday?.type === 'OPTIONAL' && selectedLeave?.status === 'APPROVED';

  return (
    <div className="relative w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 transition-colors duration-300 shadow-sm">
      
      {isValidating && (
        <div className="absolute top-4 right-4 z-10">
          <RefreshCcw size={16} className="animate-spin text-indigo-500 opacity-60" />
        </div>
      )}

      <style jsx global>{`
        .ql-editor * { color: inherit !important; background-color: transparent !important; font-family: inherit !important; }
        .react-calendar { background: transparent; border: none; font-family: inherit; width: 100% !important; }
        .react-calendar__tile { position: relative !important; aspect-ratio: 1 / 1 !important; border-radius: 12px !important; margin: 4px 0; font-weight: 700; color: #1e293b; display: flex !important; align-items: center !important; justify-content: center !important; overflow: visible !important; background: transparent !important; z-index: 0; }
        .dark .react-calendar__tile { color: #f8fafc; }
        .dark .react-calendar__navigation button { color: #f8fafc !important; }
        .react-calendar__tile abbr { position: relative !important; z-index: 3 !important; pointer-events: none; color: inherit; }
        .react-calendar__tile::before { content: ''; position: absolute; inset: 0; border-radius: 10px; z-index: 1; background: transparent; transition: background 0.15s ease; }
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
        .holiday-optional-approved::before { border: 2px dashed #ef4444 !important; background: rgba(239, 68, 68, 0.05) !important; }
        .holiday-optional-approved abbr { color: #ef4444 !important; }
        .holiday-optional::before { border: 1.5px dashed #6366f1 !important; background: rgba(99, 102, 241, 0.05) !important; }
        .holiday-optional abbr { color: #6366f1 !important; }
        .leave-approved::before { background: #ef4444 !important; }
        .leave-approved { color: #ffffff !important; }
      `}</style>

      <div className="flex justify-center overflow-hidden">
        <Calendar
          onClickDay={handleDayClick}
          tileDisabled={({ date }) => {
            if (viewOnly) return false;
            const key = format(date, "yyyy-MM-dd");
            const holiday = getHoliday(key);
            const approvedLeave = leaves.some((l: any) => {
                const d = format(date, "yyyy-MM-dd");
                return l.status === 'APPROVED' && d >= format(new Date(l.startDate), "yyyy-MM-dd") && d <= format(new Date(l.endDate), "yyyy-MM-dd");
            });
            return isFutureDate(date) && !holiday && !approvedLeave;
          }}
          prev2Label={null}
          next2Label={null}
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";
            const key = format(date, "yyyy-MM-dd");
            const taskData = tasks[key];
            const holiday = getHoliday(key); 
            const approvedLeave = leaves.find((l: any) => {
                const d = format(date, "yyyy-MM-dd");
                return l.status === 'APPROVED' && d >= format(new Date(l.startDate), "yyyy-MM-dd") && d <= format(new Date(l.endDate), "yyyy-MM-dd");
            });
            
            const hasTask = taskData?.content && taskData.content !== '<p><br></p>';
            const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
            const classes: string[] = [];
            
            if (isSameDay(date, new Date())) classes.push("tile-today-focus");
            if (hasTask) {
              classes.push("task-added");
            } else if (holiday?.type === 'OPTIONAL' && approvedLeave) {
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
             const approvedLeave = leaves.some((l: any) => {
                const d = format(date, "yyyy-MM-dd");
                return l.status === 'APPROVED' && d >= format(new Date(l.startDate), "yyyy-MM-dd") && d <= format(new Date(l.endDate), "yyyy-MM-dd");
             });
             if (holiday?.type === 'OPTIONAL' && approvedLeave) return "OH";
             if (approvedLeave) return "L";
             if (holiday) return holiday.type === 'OPTIONAL' ? "OH" : "H";
             return date.getDate().toString();
          }}
          className="minimal-white-calendar-wide"
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-3 border-t border-gray-100 dark:border-slate-800 pt-6">
        <Legend color="bg-blue-600" label="Logged" isFilled />
        <Legend color="bg-red-500" label="Missing/Leave" isFilled />
        <Legend color="bg-slate-400 opacity-50" label="Holiday" isFilled />
        <Legend color="border-indigo-500 border-dashed border-2" label="Optional" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-7xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[95vh] sm:max-h-[92vh]">
            
            <div className={`p-4 sm:p-8 text-white flex-shrink-0 flex items-center justify-between transition-colors duration-500 ${isOptionalHolidayUsed ? "bg-red-600" : isMissingTask ? "bg-red-600" : isLoggingDisabled ? "bg-slate-600" : "bg-indigo-600"}`}>
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                  <CalendarIcon className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight truncate uppercase italic">{format(selectedDate, "EEEE, MMM dd")}</h3>
                  <p className="text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
                    {isOptionalHolidayUsed ? "Used Optional Holiday" : selectedHoliday ? `${selectedHoliday.type} Holiday: ${selectedHoliday.name}` : (selectedLeave ? `Approved Leave: ${selectedLeave.type}` : "Daily Record")}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-black/10 hover:bg-black/20 rounded-xl transition-all cursor-pointer"><X /></button>
            </div>
            
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 scrollbar-hide">
              
              {isOptionalHolidayUsed && (
                <div className="mb-6 p-5 rounded-[1.5rem] bg-red-50 border-2 border-red-200 dark:bg-red-950/20 dark:border-red-900/50 flex items-center gap-4 animate-in slide-in-from-top-4">
                    <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shrink-0"><Sparkles size={24} /></div>
                    <div className="min-w-0">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600">Optional Quota Utilized</h4>
                       <p className="text-lg font-black text-slate-800 dark:text-red-100 uppercase tracking-tighter truncate">
                          {selectedHoliday?.name} — Approved Holiday
                       </p>
                    </div>
                </div>
              )}

              {!isOptionalHolidayUsed && selectedHoliday && (
                <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in zoom-in-95 ${selectedHoliday.type === 'FIXED' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100'}`}>
                  {selectedHoliday.type === 'FIXED' ? <Info className="text-blue-600 w-5 h-5" /> : <Sparkles className="text-indigo-600 w-5 h-5" />}
                  <p className={`text-[10px] font-black uppercase tracking-tight ${selectedHoliday.type === 'FIXED' ? 'text-blue-900 dark:text-blue-400' : 'text-indigo-900 dark:text-indigo-300'}`}>
                    {selectedHoliday.type === 'FIXED' ? `Fixed Company Holiday: ${selectedHoliday.name}` : `Available Optional Occasion: ${selectedHoliday.name}`}
                  </p>
                </div>
              )}

              <div className={`grid gap-6 sm:gap-8 h-full ${currentAssignedTasks.length > 0 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-[1fr_380px]"}`}>
                
                {currentAssignedTasks.length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-indigo-100 dark:border-slate-700 flex flex-col space-y-4 max-h-[400px] lg:max-h-[600px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                        <h3 className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase italic">Queue</h3>
                      </div>
                      {!viewOnly && isSelectedToday && currentAssignedTasks.some(t => !t.isDone) && (
                        <button onClick={handleMarkAllCompleted} className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-200">Mark Done</button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3">
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
                              
                              <div className="mt-2 text-[8px] font-bold text-slate-400 flex flex-col gap-1 uppercase tracking-widest">
                                {t.assignedAt && (
                                  <div className="flex items-center gap-1">
                                    <Clock size={10} className="text-indigo-400" />
                                    Assigned: {formatAssignedAt(t.assignedAt)}
                                  </div>
                                )}
                                {t.completedAt && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                    Completed: {formatAssignedAt(t.completedAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 dark:bg-slate-800/30 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 dark:border-slate-800 flex flex-col min-h-[300px] lg:max-h-[600px] overflow-hidden">
                  <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex-shrink-0 flex justify-between items-center">
                    <h3 className="text-[10px] sm:text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">My Submission</h3>
                    {selectedLeave && (
                      <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-[8px] font-black uppercase border border-red-200 dark:border-red-800">On Leave</span>
                    )}
                  </div>
                  
                  {/* Leave Warning Bar: Show only if on leave */}
                  {selectedLeave && (
                    <div className="px-4 sm:px-6 py-3 bg-red-50 dark:bg-red-950/20 border-y border-red-100 dark:border-red-900/40 flex items-center gap-2 animate-in slide-in-from-top-1">
                      <Bookmark size={12} className="text-red-500" />
                      <p className="text-[10px] font-bold text-red-700 dark:text-red-300 italic truncate">
                        Leave Reason: &quot;{selectedLeave.reason}&quot;
                      </p>
                    </div>
                  )}

                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {/* ReactQuill is now ALWAYS visible */}
                    <ReactQuill
                      theme="snow"
                      value={currentPointers}
                      onChange={setCurrentPointers}
                      modules={quillModules}
                      readOnly={viewOnly || !canEditDate(selectedDate) || isLoggingDisabled}
                      placeholder={isLoggingDisabled ? "Logging is disabled for this holiday." : "Describe what you worked on today..."}
                      className="flex-1 flex flex-col overflow-hidden"
                    />
                  </div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-amber-100 dark:border-amber-900/30 flex flex-col space-y-4 lg:max-h-[600px]">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <Edit3 size={18} />
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Status</h3>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-100 dark:border-slate-700">
                    <label className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase block mb-1">Live Tracking</label>
                    <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      {selectedLeave ? `Approved ${selectedLeave.type}` : (currentPointers && currentPointers !== '<p><br></p>' ? "Logs Received" : "Pending Logs")}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                      <MessageSquare size={14} />
                      <label className="text-[9px] font-black uppercase tracking-widest">Feedback</label>
                    </div>
                    <div className={`w-full p-4 rounded-2xl border-2 font-medium text-xs ${viewOnly ? "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 text-orange-900 dark:text-orange-200" : "bg-white dark:bg-slate-800 border-transparent text-gray-500 dark:text-slate-400 italic shadow-sm"}`}>
                      {currentComment || "No notes yet..."}
                    </div>
                  </div>
                  {((!viewOnly && canEditDate(selectedDate)) || viewOnly) && !isLoggingDisabled && (
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 ${viewOnly ? "bg-orange-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                    >
                      {isSaving ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16} />} 
                      {isSaving ? "Syncing..." : viewOnly ? "Update Notes" : "Save Log"}
                    </button>
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
  <div className="flex items-center gap-2">
    <span className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${color} ${!isFilled ? 'bg-transparent border border-gray-300' : ''}`} />
    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
  </div>
);