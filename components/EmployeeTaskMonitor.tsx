"use client";
import React, { useState, useEffect } from "react";
import { User, Search, Info } from "lucide-react";
import { EmployeeCalendar } from "./EmployeeCalendar";
import { getAuthToken } from "@/lib/api/api";

export const EmployeeTaskMonitor = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= Fetching Logic ================= */
  useEffect(() => {
    const fetchEmployees = async () => {
      const token = getAuthToken();
      try {
        const res = await fetch("/api/users/bulk", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        // Standardize data source from bulk API
        setEmployees(Array.isArray(data) ? data : data.results?.success || []);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mt-8 space-y-6">
      {/* Header with improved typography */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-gray-800">
          Employee Task Monitoring
        </h2>
        <p className="text-sm font-medium text-gray-400">
          Monitor daily work logs and attendance consistency
        </p>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Employee List Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-5 border-b border-gray-50 bg-gray-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team..."
                className="w-full pl-10 pr-4 py-3 text-sm border-none bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading...</p>
              </div>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <button
                  key={emp.id || emp.email}
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={`w-full flex items-center gap-4 p-5 text-left transition-all border-b border-gray-50 last:border-0 ${
                    selectedEmployeeId === emp.id
                      ? "bg-blue-50/50"
                      : "hover:bg-gray-50/80"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-colors ${
                    selectedEmployeeId === emp.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {emp.name}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-tight">
                      {emp.email}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                No team members
              </div>
            )}
          </div>
        </div>

        {/* Calendar View Area */}
        <div className="lg:col-span-3">
          {selectedEmployeeId ? (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <EmployeeCalendar viewOnly={true} employeeId={selectedEmployeeId} />
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] h-[650px] flex flex-col items-center justify-center text-center p-8">
              <div className="bg-gray-50 p-6 rounded-full mb-6">
                <User className="w-12 h-12 text-gray-200" />
              </div>
              <p className="text-xl font-black text-gray-300 tracking-tight">
                Team Selection Required
              </p>
              <p className="text-sm font-bold text-gray-400 mt-2 max-w-xs uppercase tracking-widest">
                Select a team member from the list to monitor their work frequency.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- Legend Component (Unified Design) ---------- */
const Legend = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2.5">
    <span className={`w-3.5 h-3.5 border-2 ${color} rounded-full`} />
    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
  </div>
);