"use client";
import React, { useState, useMemo } from "react";
import { X, UserPlus, Calendar, Check, RotateCcw, Loader2, Search, Mail, User, ShieldCheck, ChevronDown } from "lucide-react";

interface UserManagementModalProps {
  employees: any[]; 
  onAdd: (userData: { name: string; email: string; role: string }) => Promise<void>;
  onUpdate: (userId: number, updateData: { endDate: string | null }) => Promise<void>;
  onClose: () => void;
}

export function UserManagementModal({ 
  employees, 
  onAdd, 
  onUpdate, 
  onClose 
}: UserManagementModalProps) {
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "EMPLOYEE" });
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, string | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => 
      emp.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const formatDateForInput = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return "";
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd(newUser);
    setNewUser({ name: "", email: "", role: "EMPLOYEE" }); 
  };

  const handleDateChange = (userId: number, value: string) => {
    setPendingUpdates(prev => ({ ...prev, [userId]: value || null }));
  };

  const handleConfirmUpdate = async (userId: number) => {
    const newDate = pendingUpdates[userId];
    setLoadingIds(prev => new Set(prev).add(userId));
    try {
      await onUpdate(userId, { endDate: newDate });
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (error) {
      console.error("Failed to update end date:", error);
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleCancelUpdate = (userId: number) => {
    setPendingUpdates(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[95vh] sm:h-auto sm:max-h-[92vh] overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 flex flex-col">
        
        {/* Header Section */}
        <div className="p-5 sm:p-8 border-b dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight truncate">Team Directory</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-xs sm:text-base hidden sm:block">Configure access levels and service end dates</p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl sm:rounded-2xl transition-all flex-shrink-0">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          {/* Add New User Form Card */}
          <div className="mb-6 sm:mb-10 bg-indigo-50/40 dark:bg-indigo-900/10 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-indigo-100 dark:border-indigo-900/30">
            <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 ml-1">Onboard New Member</h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl sm:rounded-2xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base"
                />
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl sm:rounded-2xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm sm:text-base"
                />
              </div>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full pl-11 pr-10 py-3 rounded-xl sm:rounded-2xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer font-semibold transition-all text-sm sm:text-base"
                >
                  <option value="EMPLOYEE">Role: Employee</option>
                  <option value="MANAGER">Role: Manager</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button type="submit" className="bg-indigo-600 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest py-3 rounded-xl sm:rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none">
                <UserPlus size={18} className="hidden sm:block" /> Onboard
              </button>
            </form>
          </div>

          {/* Directory Tools */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 max-w-md order-2 sm:order-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Find someone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all font-semibold text-sm sm:text-base"
              />
            </div>
            <div className="text-left sm:text-right order-1 sm:order-2">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Directory Strength</p>
              <p className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-300">{filteredEmployees.length} Members</p>
            </div>
          </div>

          {/* Responsive Card Layout for Mobile / Table for Desktop */}
          <div className="hidden sm:block rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="py-5 px-8">Full Identity</th>
                  <th className="py-5 px-8">Communication</th>
                  <th className="py-5 px-8 text-right">Offboarding Cycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.map((emp) => (
                  <EmployeeRow 
                    key={emp.user.id}
                    emp={emp}
                    isPending={emp.user.id in pendingUpdates}
                    isLoading={loadingIds.has(emp.user.id)}
                    displayValue={emp.user.id in pendingUpdates ? (pendingUpdates[emp.user.id] || "") : formatDateForInput(emp.user.endDate)}
                    onDateChange={handleDateChange}
                    onConfirm={handleConfirmUpdate}
                    onCancel={handleCancelUpdate}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Cards */}
          <div className="sm:hidden space-y-4">
            {filteredEmployees.map((emp) => (
              <EmployeeCard 
                key={emp.user.id}
                emp={emp}
                isPending={emp.user.id in pendingUpdates}
                isLoading={loadingIds.has(emp.user.id)}
                displayValue={emp.user.id in pendingUpdates ? (pendingUpdates[emp.user.id] || "") : formatDateForInput(emp.user.endDate)}
                onDateChange={handleDateChange}
                onConfirm={handleConfirmUpdate}
                onCancel={handleCancelUpdate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for Desktop Table Row
function EmployeeRow({ emp, isPending, isLoading, displayValue, onDateChange, onConfirm, onCancel }: any) {
  return (
    <tr className="bg-white dark:bg-slate-900 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200">
      <td className="py-6 px-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 border border-slate-200 dark:border-slate-700">
            {emp.user.name?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{emp.user.name}</p>
            <span className="text-[9px] font-black bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-lg uppercase mt-1 inline-block">
              {emp.user.role}
            </span>
          </div>
        </div>
      </td>
      <td className="py-6 px-8 text-sm text-slate-600 dark:text-slate-400 font-bold">{emp.user.email}</td>
      <td className="py-6 px-8">
        <div className="flex items-center justify-end gap-3">
          <DateInput isPending={isPending} value={displayValue} onChange={(val: string) => onDateChange(emp.user.id, val)} />
          <ActionButtons isPending={isPending} isLoading={isLoading} onConfirm={() => onConfirm(emp.user.id)} onCancel={() => onCancel(emp.user.id)} />
        </div>
      </td>
    </tr>
  );
}

// Sub-component for Mobile Card
function EmployeeCard({ emp, isPending, isLoading, displayValue, onDateChange, onConfirm, onCancel }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-indigo-400 border border-indigo-100 dark:border-indigo-800">
          {emp.user.name?.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{emp.user.name}</p>
          <p className="text-[10px] text-slate-400 truncate">{emp.user.email}</p>
        </div>
        <span className="ml-auto text-[8px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-1 rounded-md uppercase">
          {emp.user.role}
        </span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
        <DateInput isPending={isPending} value={displayValue} onChange={(val: string) => onDateChange(emp.user.id, val)} />
        <ActionButtons isPending={isPending} isLoading={isLoading} onConfirm={() => onConfirm(emp.user.id)} onCancel={() => onCancel(emp.user.id)} />
      </div>
    </div>
  );
}

// Helper components for inputs to keep code DRY
function DateInput({ isPending, value, onChange }: any) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isPending ? 'border-amber-400 ring-4 ring-amber-400/10 bg-amber-50/30 dark:bg-amber-900/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
      <Calendar size={14} className={isPending ? 'text-amber-500' : 'text-slate-400'} />
      <input 
        type="date" 
        value={value || ""} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent dark:text-white text-xs outline-none cursor-pointer font-bold w-28"
      />
    </div>
  );
}

function ActionButtons({ isPending, isLoading, onConfirm, onCancel }: any) {
  if (isLoading) return <Loader2 size={20} className="text-indigo-600 animate-spin ml-2" />;
  if (!isPending) return null;
  return (
    <div className="flex gap-2 animate-in slide-in-from-right-4">
      <button onClick={onConfirm} className="p-2 bg-green-500 text-white rounded-lg shadow-md"><Check size={14} strokeWidth={4} /></button>
      <button onClick={onCancel} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"><RotateCcw size={14} strokeWidth={3} /></button>
    </div>
  );
}