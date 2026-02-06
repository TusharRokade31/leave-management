"use client";
import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, isSameDay } from "date-fns";
import { X, Calendar as CalendarIcon, Save, AlertTriangle, MessageSquare } from "lucide-react";
import { getAuthToken } from "@/lib/api/api";
import { canEditDate, isFutureDate } from "@/utils/date";
import useSWR from "swr"; 

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

export const EmployeeCalendar = ({ viewOnly = false, employeeId }: { viewOnly?: boolean; employeeId?: number }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentPointers, setCurrentPointers] = useState("");
  const [currentComment, setCurrentComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const url = employeeId ? `/api/tasks?userId=${employeeId}` : "/api/tasks";
  const { data: tasks = {}, mutate } = useSWR(url, fetcher, {
    refreshInterval: 10000, 
    revalidateOnFocus: true,
  });

  const handleDayClick = (date: Date) => {
    if (!viewOnly && isFutureDate(date)) return;
    const dateKey = format(date, "yyyy-MM-dd");
    const existingTask = tasks[dateKey];
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

  return (
    /* FIXED CONTAINER: background set to slate-900 (black-ish) in dark mode */
    <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 transition-colors duration-300 shadow-sm">
      
      {/* Global Style Override to force transparency and theme colors */}
      <style jsx global>{`
        .dark .react-calendar {
          background-color: transparent !important;
          border: none !important;
          color: #f1f5f9 !important;
          font-family: inherit;
        }
        .dark .react-calendar__tile {
          color: #94a3b8 !important;
        }
        .dark .react-calendar__tile:enabled:hover,
        .dark .react-calendar__tile:enabled:focus {
          background-color: #1e293b !important;
          border-radius: 12px;
        }
        .dark .react-calendar__navigation button {
          color: #f1f5f9 !important;
          min-width: 44px;
          background: none;
        }
        .dark .react-calendar__navigation button:enabled:hover,
        .dark .react-calendar__navigation button:enabled:focus {
          background-color: #1e293b !important;
        }
        .dark .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
          color: #64748b !important;
          font-weight: 800;
          font-size: 0.75rem;
        }
        /* Prevents white background on the active/selected tile */
        .dark .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
          border-radius: 12px;
        }
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
            let classes = "custom-tile transition-all duration-200 ";

            if (isSameDay(date, new Date())) return classes + "tile-today-focus ring-2 ring-blue-600 dark:ring-blue-400";
            if (tasks[key]?.content) return classes + "ring-task-inserted border-b-2 border-red-500 dark:border-red-400";

            return classes;
          }}
          className="minimal-white-calendar-wide"
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 border-t border-gray-100 dark:border-slate-800 pt-6">
        <Legend color="border-blue-600 dark:border-blue-400 border-[2px]" label="Today" />
        <Legend color="border-red-500 dark:border-red-400 border-[1.5px]" label="Task Logged" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 dark:from-indigo-900 dark:to-slate-900 p-8 text-white">
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 rounded-full transition-all z-50 cursor-pointer"
              >
                <X size={20} strokeWidth={3} />
              </button>
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <CalendarIcon size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {viewOnly ? "Review Activity" : "Update Schedule"}
                </span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{format(selectedDate, "MMMM dd")}</h3>
            </div>
            
            <div className="p-8 space-y-6">
              {!viewOnly && !canEditDate(selectedDate) && (
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl">
                  <AlertTriangle size={16} /> 
                  <span>Entry restricted for this date</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 dark:text-blue-500">What did you work on?</label>
                <textarea
                  className="w-full h-32 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-100 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl p-5 outline-none transition-all resize-none text-zinc-800 dark:text-slate-200 font-medium placeholder-gray-400"
                  readOnly={viewOnly || !canEditDate(selectedDate)}
                  placeholder="Employee description..."
                  value={currentPointers}
                  onChange={(e) => setCurrentPointers(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
                  <MessageSquare size={14} />
                  <label className="text-[10px] font-black uppercase tracking-widest">Manager Feedback</label>
                </div>
                <textarea
                  className={`w-full h-24 rounded-2xl p-5 outline-none transition-all resize-none font-medium border-2 ${
                    viewOnly 
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 focus:bg-white dark:focus:bg-slate-800 focus:border-orange-200 dark:focus:border-orange-500 text-zinc-800 dark:text-slate-200" 
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
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <span className={`w-3 h-3 border-2 ${color} rounded-full`} />
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500 transition-colors">{label}</span>
  </div>
);