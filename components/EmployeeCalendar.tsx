"use client";
import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import ReactDOM from "react-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, isSameDay, isBefore, startOfDay } from "date-fns";
import { X, Calendar as CalendarIcon, Save, AlertTriangle, MessageSquare, CheckCircle2, Building2, ListTodo, CheckSquare, Clock, RefreshCcw, Edit3 } from "lucide-react";
import { getAuthToken } from "@/lib/api/api";
import { canEditDate, isFutureDate } from "@/utils/date";
import useSWR from "swr";

// Dynamic import for React Quill
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-48 w-full bg-gray-50 dark:bg-slate-800 animate-pulse rounded-xl border border-gray-200 dark:border-slate-700" />
});
import 'react-quill/dist/quill.snow.css';

// --- REACT 19 COMPATIBILITY PATCH ---
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
  companyName?: string; 
  taskTitle?: string;   
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
  const data = await res.json();

  const map: Record<string, TaskData> = {};
  data?.forEach((t: any) => {
    map[format(new Date(t.date), "yyyy-MM-dd")] = {
      content: t.content || "",
      managerComment: t.managerComment || "",
      assignedTasks: (t.assignedTasks || []).map((at: any) => ({
        id: at.id,
        company: at.company || at.companyName || "Internal",
        task: at.task || at.taskTitle || "",
        isDone: Boolean(at.isDone),
        assignedAt: at.assignedAt || at.createdAt
      }))
    };
  });
  return map;
};

export const EmployeeCalendar = forwardRef(({ viewOnly = false, employeeId }: { viewOnly?: boolean; employeeId?: number }, ref) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentPointers, setCurrentPointers] = useState("");
  const [currentComment, setCurrentComment] = useState("");
  const [currentAssignedTasks, setCurrentAssignedTasks] = useState<AssignedTask[]>([]); 
  const [isSaving, setIsSaving] = useState(false);
  const [isMissingTask, setIsMissingTask] = useState(false); 

  const url = employeeId ? `/api/tasks?userId=${employeeId}` : "/api/tasks";
  const { data: tasks = {}, mutate } = useSWR(url, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  useImperativeHandle(ref, () => ({
    openToday: () => {
      handleDayClick(new Date());
    }
  }));

  const formatAssignedAt = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "";
    }
  };

  const handleDayClick = (date: Date) => {
    if (!viewOnly && isFutureDate(date)) return;
    const dateKey = format(date, "yyyy-MM-dd");
    const existingTask = tasks[dateKey];
    
    const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
    const hasRealContent = existingTask?.content && existingTask.content !== '<p><br></p>';
    const missing = isPast && !hasRealContent && !viewOnly;
    
    setIsMissingTask(missing);
    setSelectedDate(date);
    setCurrentPointers(existingTask?.content || "");
    setCurrentComment(existingTask?.managerComment || "");
    setCurrentAssignedTasks(existingTask?.assignedTasks || []); 
    setShowModal(true);
  };

  const performSave = async (assignedToSave?: AssignedTask[]) => {
    setIsSaving(true);
    const token = getAuthToken();
    const dateToSave = format(selectedDate, "yyyy-MM-dd");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: dateToSave,
          content: viewOnly ? undefined : currentPointers,
          managerComment: viewOnly ? currentComment : undefined,
          assignedTasks: assignedToSave || currentAssignedTasks, 
          employeeId: employeeId
        }),
      });

      if (res.ok) {
        await mutate();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAssignedTask = async (index: number) => {
    if (viewOnly || !isSameDay(selectedDate, new Date())) return; 
    const updatedTasks = currentAssignedTasks.map((t, i) => 
        i === index ? { ...t, isDone: !t.isDone } : t
    );
    setCurrentAssignedTasks(updatedTasks);
    await performSave(updatedTasks);
  };

  const handleMarkAllCompleted = async () => {
    if (viewOnly || !isSameDay(selectedDate, new Date())) return;
    const updatedTasks = currentAssignedTasks.map(t => ({ ...t, isDone: true }));
    setCurrentAssignedTasks(updatedTasks);
    await performSave(updatedTasks);
  };

  const handleSave = async () => {
    if (!viewOnly && !canEditDate(selectedDate)) return;
    await performSave();
    setShowModal(false);
  };

  const quillModules = {
    toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], ['clean']],
  };

  const hasPendingTasks = currentAssignedTasks.some(t => !t.isDone);
  const isSelectedToday = isSameDay(selectedDate, new Date());

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 transition-colors duration-300 shadow-sm">
      
      <style jsx global>{`
        .dark .react-calendar { background-color: transparent !important; border: none !important; color: #ffffff !important; }
        .dark .react-calendar__tile { color: #ffffff !important; font-weight: 600; }
        .task-added { background-color: #2563eb !important; color: white !important; border-radius: 12px !important; }
        .task-missing { background-color: #ef4444 !important; color: white !important; border-radius: 12px !important; }
        .tile-today-focus { border: 2px solid #2563eb !important; border-radius: 12px !important; }
        .ql-editor { min-height: 180px; font-size: 16px; border: none !important; }
        @media (min-width: 1024px) { .ql-editor { min-height: 250px; } }
        .ql-container.ql-snow { border: none !important; }
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #fafafa; }
        .dark .ql-toolbar.ql-snow { background: #1e293b; border-bottom: 1px solid #334155 !important; }
        .react-calendar { width: 100% !important; max-width: 100%; background: white; border: none; font-family: inherit; }
      `}</style>

      <div className="flex justify-center overflow-hidden">
        <Calendar
          onClickDay={handleDayClick}
          tileDisabled={({ date }) => !viewOnly && isFutureDate(date)}
          next2Label={null}
          prev2Label={null}
          value={null}
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";
            const key = format(date, "yyyy-MM-dd");
            const hasTask = tasks[key]?.content && tasks[key].content !== '<p><br></p>';
            const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
            
            let classes = "custom-tile transition-all duration-200 ";
            if (isSameDay(date, new Date())) classes += "tile-today-focus ";
            if (hasTask) classes += "task-added ";
            else if (isPast && !viewOnly) classes += "task-missing ";
            return classes;
          }}
          className="minimal-white-calendar-wide"
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-3 border-t border-gray-100 dark:border-slate-800 pt-6">
        <Legend color="bg-blue-600" label="Logged" isFilled />
        <Legend color="bg-red-500" label="Missing" isFilled />
        <Legend color="border-blue-600 border-2" label="Today" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-7xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 flex flex-col max-h-[95vh] sm:max-h-[92vh]">
            
            {/* Header */}
            <div className={`p-4 sm:p-8 text-white flex-shrink-0 flex items-center justify-between ${
              isMissingTask ? "bg-red-600" : "bg-indigo-600"
            }`}>
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                  <CalendarIcon className="w-5 h-5 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight truncate">{format(selectedDate, "EEEE, MMM dd")}</h3>
                  <p className="text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">
                    {viewOnly ? "Review Mode" : "Task Lifecycle"}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-xl transition-all cursor-pointer shrink-0">
                <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 scrollbar-hide">
              {/* Responsive Grid: 1 column on small, 3 on large */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 h-full">
                
                {/* Column 1: Assigned Tasks */}
                <div className="bg-indigo-50/50 dark:bg-slate-800/50 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-indigo-100 dark:border-slate-700 flex flex-col space-y-4 max-h-[400px] lg:max-h-[600px]">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                      <h3 className="text-xs sm:text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase italic">Queue</h3>
                    </div>
                    {!viewOnly && isSelectedToday && hasPendingTasks && (
                      <button onClick={handleMarkAllCompleted} className="text-[9px] sm:text-[10px] font-black text-indigo-600 uppercase border-b-2 border-indigo-200">
                        Mark Done
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-indigo-200">
                    {currentAssignedTasks.length > 0 ? currentAssignedTasks.map((t, idx) => (
                      <div key={t.id ?? idx} className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-indigo-50 shadow-sm group">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            checked={t.isDone} 
                            onChange={() => handleToggleAssignedTask(idx)}
                            disabled={viewOnly || !isSelectedToday}
                            className="mt-1 h-4 w-4 rounded border-indigo-200 text-indigo-600 cursor-pointer" 
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[7px] sm:text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase truncate block w-fit">{t.company}</span>
                            <div className={`text-[10px] sm:text-[11px] mt-1 font-medium break-words ${t.isDone ? 'line-through text-gray-400' : 'text-gray-700 dark:text-slate-300'}`} dangerouslySetInnerHTML={{ __html: t.task }} />
                            {t.assignedAt && (
                               <div className="flex items-center gap-1 mt-2 text-[7px] sm:text-[8px] font-bold text-gray-400">
                                 <Clock size={10} /> {formatAssignedAt(t.assignedAt)}
                               </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 py-6 sm:py-10">
                        <CheckCircle2 size={32} strokeWidth={1} />
                        <p className="text-[9px] sm:text-[10px] font-black uppercase mt-2 text-center">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Employee Submission */}
                <div className="bg-gray-50 dark:bg-slate-800/30 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-gray-100 dark:border-slate-800 flex flex-col max-h-[400px] lg:max-h-[600px]">
                  <h3 className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex-shrink-0">My Submission</h3>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-1 flex flex-col min-h-0">
                    <ReactQuill 
                      theme="snow"
                      value={currentPointers}
                      onChange={setCurrentPointers}
                      modules={quillModules}
                      readOnly={viewOnly || !canEditDate(selectedDate)}
                      placeholder="Describe what you worked on today..."
                    />
                  </div>
                </div>

                {/* Column 3: Status & Action */}
                <div className="bg-amber-50/50 dark:bg-amber-950/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-amber-100 dark:border-amber-900/30 flex flex-col space-y-4 sm:space-y-6 max-h-[400px] lg:max-h-[600px]">
                  <div className="flex items-center gap-2 text-amber-800 flex-shrink-0">
                    <Edit3 size={18} />
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Status</h3>
                  </div>
                  
                  <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-amber-100 shadow-sm">
                      <label className="text-[9px] sm:text-[10px] font-black text-amber-700 uppercase block mb-1">Live Tracking</label>
                      <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-slate-200">
                        {currentPointers && currentPointers !== '<p><br></p>' ? "Logs Received" : "Pending Logs"}
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 text-orange-600">
                        <MessageSquare size={14} />
                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Feedback</label>
                      </div>
                      <div className={`w-full p-3 sm:p-5 rounded-2xl border-2 font-medium text-xs sm:text-sm transition-all ${
                        viewOnly ? "bg-orange-50 dark:bg-orange-950/20 border-orange-100" : "bg-white dark:bg-slate-800 border-transparent text-gray-500 italic shadow-sm"
                      }`}>
                        {currentComment || "No notes yet..."}
                      </div>
                    </div>
                  </div>

                  {((!viewOnly && canEditDate(selectedDate)) || viewOnly) && (
                    <button 
                      onClick={handleSave} 
                      disabled={isSaving} 
                      className={`w-full py-4 sm:py-5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 shrink-0 ${
                        viewOnly ? "bg-orange-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      }`}
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
    <span className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${color} ${!isFilled ? 'bg-transparent' : ''}`} />
    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
  </div>
);