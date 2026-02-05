"use client";
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format, isSameDay } from "date-fns";
import { X, Calendar as CalendarIcon, Save, AlertTriangle } from "lucide-react";
import { getAuthToken } from "@/lib/api/api";
import { canEditDate, isFutureDate } from "@/utils/date";

export const EmployeeCalendar = ({ viewOnly = false, employeeId }: { viewOnly?: boolean; employeeId?: number }) => {
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showModal, setShowModal] = useState(false);
  const [currentPointers, setCurrentPointers] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchTasks = async () => {
    try {
      const token = getAuthToken();
      const url = employeeId ? `/api/tasks?userId=${employeeId}` : "/api/tasks";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const map: Record<string, string> = {};
      data?.forEach((t: any) => {
        map[format(new Date(t.date), "yyyy-MM-dd")] = t.content;
      });
      setTasks(map);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTasks(); }, [employeeId]);

  const handleDayClick = (date: Date) => {
    if (!viewOnly && isFutureDate(date)) return;
    setSelectedDate(date);
    setCurrentPointers(tasks[format(date, "yyyy-MM-dd")] || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!canEditDate(selectedDate)) return;
    setIsSaving(true);
    const token = getAuthToken();
    const normalized = new Date(selectedDate);
    normalized.setHours(0, 0, 0, 0);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: normalized.toISOString(), content: currentPointers }),
      });

      if (res.ok) {
        const updated = await res.json();
        const dateKey = format(new Date(updated.date), "yyyy-MM-dd");
        setTasks((prev) => ({ ...prev, [dateKey]: updated.content }));
        setShowModal(false);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calendar-card-container-wide">
      <Calendar
        onClickDay={handleDayClick}
        tileDisabled={({ date }) => !viewOnly && isFutureDate(date)}
        next2Label={null}
        prev2Label={null}
        
        /* THE FIX: Passing null stops the internal visual selection masking */
        value={null} 

        tileClassName={({ date, view }) => {
          if (view !== "month") return "";
          const key = format(date, "yyyy-MM-dd");
          let classes = "custom-tile ";

          if (isSameDay(date, new Date())) return classes + "tile-today-focus";
          if (tasks[key]) return classes + "ring-task-inserted";

          return classes;
        }}
        className="minimal-white-calendar-wide"
      />

      <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-4 border-t border-gray-100 pt-6">
        <Legend color="border-blue-600 border-[2px]" label="Today" />
        <Legend color="border-red-500 border-[1.5px]" label="Task Logged" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all z-50 cursor-pointer">
                <X size={20} strokeWidth={3} />
              </button>
              <div className="flex items-center gap-3 mb-2 opacity-80">
                <CalendarIcon size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Update Schedule</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{format(selectedDate, "MMMM dd")}</h3>
            </div>
            <div className="p-8">
              {!viewOnly && !canEditDate(selectedDate) && (
                <div className="mb-6 flex items-center gap-3 text-[10px] font-bold uppercase text-blue-800 bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                  <AlertTriangle size={16} /> 
                  <span>Entry restricted for this date</span>
                </div>
              )}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">Activity Pointers</label>
                <textarea
                  className="w-full h-40 bg-gray-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl p-5 outline-none transition-all resize-none text-zinc-800 font-medium"
                  readOnly={viewOnly || !canEditDate(selectedDate)}
                  placeholder="Describe your work..."
                  value={currentPointers}
                  onChange={(e) => setCurrentPointers(e.target.value)}
                />
                {!viewOnly && canEditDate(selectedDate) && (
                  <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-3 w-full bg-blue-600 text-white font-bold py-5 rounded-2xl transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-30">
                    <Save size={18} /> {isSaving ? "Saving..." : "Save Daily Log"}
                  </button>
                )}
              </div>
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
    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
  </div>
);