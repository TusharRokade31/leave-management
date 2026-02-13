"use client";
import React, { useState, forwardRef, useImperativeHandle } from "react";
import ReactDOM from "react-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, isSameDay, isBefore, startOfDay } from "date-fns";
import { X, Calendar as CalendarIcon, Save, AlertTriangle, MessageSquare } from "lucide-react";
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

interface TaskData {
  content: string;
  managerComment: string;
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
      managerComment: t.managerComment || ""
    };
  });
  return map;
};

export const EmployeeCalendar = forwardRef(({ viewOnly = false, employeeId }: { viewOnly?: boolean; employeeId?: number }, ref) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentPointers, setCurrentPointers] = useState("");
  const [currentComment, setCurrentComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isMissingTask, setIsMissingTask] = useState(false); // New state to track tile color sync

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

  const handleDayClick = (date: Date) => {
    if (!viewOnly && isFutureDate(date)) return;
    const dateKey = format(date, "yyyy-MM-dd");
    const existingTask = tasks[dateKey];
    
    // Check if the tile clicked was a "missing" (red) tile
    const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
    const missing = isPast && !existingTask?.content && !viewOnly;
    
    setIsMissingTask(missing);
    setSelectedDate(date);
    setCurrentPointers(existingTask?.content || "");
    setCurrentComment(existingTask?.managerComment || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!viewOnly && !canEditDate(selectedDate)) return;
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
          employeeId: employeeId
        }),
      });

      if (res.ok) {
        await mutate();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 transition-colors duration-300 shadow-sm">
      
      <style jsx global>{`
        .dark .react-calendar {
          background-color: transparent !important;
          border: none !important;
          color: #ffffff !important;
        }
        .dark .react-calendar__tile { color: #ffffff !important; font-weight: 600; }
        .dark .react-calendar__month-view__weekdays__weekday abbr { color: #94a3b8 !important; text-decoration: none; }
        
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: transparent !important;
        }

        .dark .react-calendar__tile:enabled:hover {
          background-color: #1e293b !important;
          border-radius: 12px;
        }
        .dark .react-calendar__navigation button { color: #ffffff !important; background: none; }
        
        .task-added { background-color: #2563eb !important; color: white !important; border-radius: 12px !important; }
        .task-missing { background-color: #ef4444 !important; color: white !important; border-radius: 12px !important; }
        .tile-today-focus { border: 2px solid #2563eb !important; border-radius: 12px !important; }

        .dark .ql-toolbar { 
          background: #1e293b; 
          border-color: #334155 !important; 
          border-top-left-radius: 12px; 
          border-top-right-radius: 12px; 
        }
        .dark .ql-container { 
          background: #0f172a; 
          border-color: #334155 !important; 
          border-bottom-left-radius: 12px; 
          border-bottom-right-radius: 12px; 
          color: #f8fafc !important; 
        }
        .dark .ql-stroke { stroke: #94a3b8 !important; }
        .dark .ql-fill { fill: #94a3b8 !important; }
        .dark .ql-picker { color: #94a3b8 !important; }
        .ql-editor { min-height: 200px; font-size: 16px; }
        .ql-editor.ql-blank::before { color: #64748b !important; }
      `}</style>

      <div className="flex justify-center">
        <Calendar
          onClickDay={handleDayClick}
          tileDisabled={({ date }) => !viewOnly && isFutureDate(date)}
          next2Label={null}
          prev2Label={null}
          value={null}
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";
            const key = format(date, "yyyy-MM-dd");
            const hasTask = !!tasks[key]?.content;
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

      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-gray-100 dark:border-slate-800 pt-6">
        <Legend color="bg-blue-600" label="Logged" isFilled />
        <Legend color="bg-red-500" label="Missing" isFilled />
        <Legend color="border-blue-600 border-2" label="Today" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            
            {/* Dynamic Header Gradient: Red if missing, Blue otherwise */}
            <div className={`relative p-8 text-white transition-colors duration-500 ${
              isMissingTask 
                ? "bg-gradient-to-br from-red-500 to-red-700 dark:from-red-900 dark:to-slate-900" 
                : "bg-gradient-to-br from-blue-600 to-blue-800 dark:from-indigo-900 dark:to-slate-900"
            }`}>
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 rounded-full transition-all z-50 cursor-pointer"
              >
                <X size={20} strokeWidth={3} />
              </button>
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <CalendarIcon size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {viewOnly ? "Review Activity" : "Update Schedule"}
                </span>
              </div>
              <h3 className="text-3xl font-black tracking-tight text-white">{format(selectedDate, "MMMM dd")}</h3>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {!viewOnly && !canEditDate(selectedDate) && (
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl">
                  <AlertTriangle size={16} /> 
                  <span>Entry restricted for this date</span>
                </div>
              )}

              <div className="space-y-3">
                <label className={`text-[10px] font-black uppercase tracking-widest ${isMissingTask ? 'text-red-500' : 'text-blue-500 dark:text-indigo-400'}`}>Task Log</label>
                <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm">
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

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
                  <MessageSquare size={14} />
                  <label className="text-[10px] font-black uppercase tracking-widest">Manager Feedback</label>
                </div>
                <textarea
                  className={`w-full h-24 rounded-2xl p-5 outline-none transition-all resize-none font-medium border-2 ${
                    viewOnly 
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/40 focus:bg-white dark:focus:bg-slate-800 focus:border-orange-200 dark:focus:border-orange-500 text-slate-800 dark:text-slate-100" 
                      : "bg-gray-100 dark:bg-slate-800 border-transparent cursor-not-allowed text-gray-500 dark:text-slate-500"
                  }`}
                  readOnly={!viewOnly}
                  placeholder={viewOnly ? "Type feedback here..." : "No feedback yet..."}
                  value={currentComment}
                  onChange={(e) => setCurrentComment(e.target.value)}
                />
              </div>

              {((!viewOnly && canEditDate(selectedDate)) || viewOnly) && (
                <button 
                  onClick={handleSave} 
                  disabled={isSaving} 
                  className={`flex items-center justify-center gap-3 w-full font-bold py-5 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-30 shadow-lg ${
                    viewOnly 
                      ? "bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white shadow-orange-100 dark:shadow-none" 
                      : isMissingTask 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-red-100 dark:shadow-none"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white shadow-blue-100 dark:shadow-none"
                  }`}
                >
                  <Save size={18} /> {isSaving ? "Saving..." : viewOnly ? "Save Feedback" : "Save Daily Log"}
                </button>
              )}
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
    <span className={`w-3 h-3 rounded-full ${color} ${!isFilled ? 'bg-transparent' : ''}`} />
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-400 transition-colors">{label}</span>
  </div>
);