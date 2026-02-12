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

  // Search filter logic - kept intact
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => 
      emp.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  // Date formatting logic - kept intact
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-slate-800 flex flex-col">
        
        {/* Header Section */}
        <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Team Directory</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Configure access levels and service end dates</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all duration-200">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {/* Add New User Form Card */}
          <div className="mb-10 bg-indigo-50/40 dark:bg-indigo-900/10 rounded-[2rem] p-6 border border-indigo-100 dark:border-indigo-900/30">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-4 ml-1">Onboard New Member</h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              
              {/* Styled Dropdown Container */}
              <div className="relative group">
                <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full pl-11 pr-10 py-3 rounded-2xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer font-semibold group-hover:border-indigo-300 transition-all"
                >
                  <option value="EMPLOYEE">Role: Employee</option>
                  <option value="MANAGER">Role: Manager</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
              </div>

              <button type="submit" className="bg-indigo-600 text-white font-black uppercase text-xs tracking-widest py-3 rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none">
                <UserPlus size={18} /> Onboard
              </button>
            </form>
          </div>

          {/* Directory Tools */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Find someone by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all font-semibold"
              />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Directory Strength</p>
              <p className="text-xl font-black text-slate-700 dark:text-slate-300">{filteredEmployees.length} Members</p>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="py-5 px-8">Full Identity</th>
                  <th className="py-5 px-8">Communication</th>
                  <th className="py-5 px-8">Offboarding Cycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredEmployees.map((emp) => {
                  const isPending = emp.user.id in pendingUpdates;
                  const isLoading = loadingIds.has(emp.user.id);
                  const displayValue = isPending 
                    ? (pendingUpdates[emp.user.id] || "") 
                    : formatDateForInput(emp.user.endDate);

                  return (
                    <tr key={emp.user.id} className="bg-white dark:bg-slate-900 group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-200">
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 uppercase border border-slate-200 dark:border-slate-700">
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
                      <td className="py-6 px-8">
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">{emp.user.email}</p>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${isPending ? 'border-amber-400 ring-4 ring-amber-400/10 bg-amber-50/30 dark:bg-amber-900/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}>
                            <Calendar size={16} className={isPending ? 'text-amber-500' : 'text-slate-400'} />
                            <input 
                              type="date" 
                              value={displayValue || ""} 
                              onChange={(e) => handleDateChange(emp.user.id, e.target.value)}
                              className="bg-transparent dark:text-white text-sm outline-none cursor-pointer font-bold w-32"
                            />
                          </div>
                          
                          {isPending && !isLoading && (
                            <div className="flex gap-2 animate-in slide-in-from-right-4 duration-300">
                              <button 
                                onClick={() => handleConfirmUpdate(emp.user.id)}
                                className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-90"
                                title="Confirm Update"
                              >
                                <Check size={16} strokeWidth={4} />
                              </button>
                              <button 
                                onClick={() => handleCancelUpdate(emp.user.id)}
                                className="p-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                                title="Discard Changes"
                              >
                                <RotateCcw size={16} strokeWidth={3} />
                              </button>
                            </div>
                          )}

                          {isLoading && (
                            <div className="p-2.5">
                              <Loader2 size={24} className="text-indigo-600 animate-spin" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}