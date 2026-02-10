"use client";
import React, { useState, useEffect } from "react";
import { X, Trash2, UserPlus, Calendar, Check, RotateCcw, Loader2 } from "lucide-react";

interface UserManagementModalProps {
  employees: any[]; 
  onAdd: (userData: { name: string; email: string; role: string }) => Promise<void>;
  onUpdate: (userId: number, updateData: { endDate: string | null }) => Promise<void>;
  onDelete: (userId: number) => Promise<void>;
  onClose: () => void;
}

export function UserManagementModal({ 
  employees, 
  onAdd, 
  onUpdate, 
  onDelete, 
  onClose 
}: UserManagementModalProps) {
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "EMPLOYEE" });
  
  // Track changes before the user clicks tick
  const [pendingUpdates, setPendingUpdates] = useState<Record<number, string | null>>({});
  // Track updates that are currently being sent to the server
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  // PERSISTENCE LOCK: Remembers what was just saved so the UI doesn't "jump back"
  const [optimisticDates, setOptimisticDates] = useState<Record<number, string | null>>({});

  // Helper to format ISO Date to YYYY-MM-DD strictly
  // Uses UTC methods to avoid timezone shifting issues
  const formatDateForInput = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      
      // Use UTC methods to avoid timezone issues
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
    
    // 1. Enter loading state
    setLoadingIds(prev => new Set(prev).add(userId));
    
    try {
      // 2. Call the API
      await onUpdate(userId, { endDate: newDate });
      
      // 3. Clear pending state after success
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      
      // 4. Clear optimistic state - trust the fresh data from parent component
      setOptimisticDates(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (error) {
      console.error("Failed to update end date:", error);
      // On error, revert to previous state
      setPendingUpdates(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } finally {
      // 5. Exit loading state
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2rem] shadow-2xl border border-gray-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">User Directory</h2>
            <p className="text-sm text-gray-500 font-medium">Manage team members and offboarding dates</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Add New User Form */}
          <form onSubmit={handleAddSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <input
              type="text"
              placeholder="Full Name"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="px-4 py-2 rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="px-4 py-2 rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="px-4 py-2 rounded-xl border dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-100 dark:shadow-none">
              <UserPlus size={18} /> Add User
            </button>
          </form>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-gray-400 text-[10px] uppercase tracking-widest font-black">
                  <th className="px-4">Employee</th>
                  <th className="px-4">Contact</th>
                  <th className="px-4">End Date (Offboarding)</th>
                  <th className="px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isPending = emp.user.id in pendingUpdates;
                  const isLoading = loadingIds.has(emp.user.id);
                  
                  // Display logic: Pending > Server data (always formatted)
                  // This ensures dates persist correctly after save
                  const displayValue = isPending 
                    ? (pendingUpdates[emp.user.id] || "") 
                    : formatDateForInput(emp.user.endDate);

                  return (
                    <tr key={emp.user.id} className="bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-800 dark:text-white">{emp.user.name}</p>
                        <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded uppercase">{emp.user.role}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 font-medium">{emp.user.email}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isPending ? 'border-orange-300 bg-orange-50/30 dark:bg-orange-900/10' : 'border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800'}`}>
                            <Calendar size={14} className={isPending ? 'text-orange-500' : 'text-gray-400'} />
                            <input 
                              type="date" 
                              value={displayValue || ""} 
                              onChange={(e) => handleDateChange(emp.user.id, e.target.value)}
                              className="bg-transparent dark:text-white text-sm outline-none cursor-pointer font-bold"
                            />
                          </div>
                          
                          {/* Confirmation UI */}
                          {isPending && !isLoading && (
                            <div className="flex gap-1 animate-in fade-in zoom-in duration-200">
                              <button 
                                onClick={() => handleConfirmUpdate(emp.user.id)}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg shadow-green-100 dark:shadow-none transition-all active:scale-90"
                              >
                                <Check size={14} strokeWidth={4} />
                              </button>
                              <button 
                                onClick={() => handleCancelUpdate(emp.user.id)}
                                className="p-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 rounded-lg transition-all"
                              >
                                <RotateCcw size={14} strokeWidth={3} />
                              </button>
                            </div>
                          )}

                          {isLoading && (
                            <Loader2 size={20} className="text-indigo-600 animate-spin" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => onDelete(emp.user.id)} 
                          className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 size={18}/>
                        </button>
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