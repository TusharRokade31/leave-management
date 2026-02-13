"use client";
import React, { useState, useRef, useMemo } from "react";
import { Upload, Users, LogOut, AlertTriangle, X, Calendar as CalendarIcon, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react"; 
import { useAuth } from "@/hooks/useAuth";
import { useLeaves } from "@/hooks/useLeaves";
import { useDashboardLeaves } from "@/hooks/useDashboardLeave";
import { useEmployeeWorkStatus } from "@/hooks/useEmployeeWorkStatus";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCard";
import { LeaveForm } from "@/components/LeaveForm";
import { EmployeeLeaveTable } from "@/components/EmployeeLeaveTable";
import { ManagerLeaveTable } from "@/components/ManagerLeaveTable";
import { NotificationPanel } from "@/components/NotificationPanel";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { UserManagementModal } from "@/components/UserManagementModal";
import { OffboardingAlert } from "@/components/OffboardingAlert"; 
import { LoginForm } from "@/components/LoginForm";
import { LeaveFormData } from "@/type/form";
import EmployeeWorkStatusTable from "@/components/EmployeeWorkStatusTable";
import { EmployeeCalendar } from "@/components/EmployeeCalendar";
import { ToastContainer, toast } from 'react-toastify';
import { formatDate } from "@/utils/formatDate";

export default function Home() {
  const { currentUser, loading, login, otpLogin, logout } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const taskMonitorRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null);

  const scrollToTaskMonitor = () => {
    taskMonitorRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const leaveHooks = useLeaves(currentUser);
  const leavedashboard = useDashboardLeaves(currentUser, currentMonth);
  
  const { 
    employees, 
    loading: workStatusLoading, 
    updateTaskFeedback,
    addUser,
    updateUser, 
    // REMOVED: deleteUser logic has been stripped out
    refreshData 
  } = useEmployeeWorkStatus(currentUser, currentMonth);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [selectedLeaveForView, setSelectedLeaveForView] = useState<any | null>(null);

  // ================= NOTIFICATION LOGIC (Type-Safe Sync) =================
  const managerNotifications = useMemo(() => 
    leaveHooks.leaves.filter((l) => l.status === "PENDING"), 
  [leaveHooks.leaves]);

  const employeeNotifications = useMemo(() => {
    if (!currentUser || currentUser.role !== "EMPLOYEE") return [];
    return leaveHooks.leaves.filter((l) => l.status === "PENDING")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [leaveHooks.leaves, currentUser]);

  const activeNotificationCount = useMemo(() => {
    if (!currentUser) return 0;
    return currentUser.role === "MANAGER" 
      ? managerNotifications.length 
      : employeeNotifications.length;
  }, [currentUser, managerNotifications, employeeNotifications]);

  const visibleEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!emp.user.endDate) return true;
      const userEndDate = new Date(emp.user.endDate);
      const viewDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endMonthDate = new Date(userEndDate.getFullYear(), userEndDate.getMonth(), 1);
      return viewDate <= endMonthDate;
    });
  }, [employees, currentMonth]);

  const handleLogin = async (email: string, password: string) =>
    await login(email, password);
  const handleOTPLogin = async (email: string, otp: string) =>
    await otpLogin(email, otp);
  
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      setShowLeaveForm(false);
      setShowNotifications(false);
      setShowBulkUpload(false);
      setShowUserManagement(false);
      toast.info("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please clear your browser cache.");
    }
  };

  const handleLeaveSubmit = async (formData: LeaveFormData) => {
    await leaveHooks.createLeave(formData);
    setShowLeaveForm(false);
  };

  const handleLeaveUpdate = async (leaveId: number, updatedData: any) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update leave');
      }

      toast.success("Leave request updated successfully!");
      if (leaveHooks.fetchLeaves) await leaveHooks.fetchLeaves();
    } catch (error: any) {
      console.error("Error updating leave:", error);
      toast.error(error.message || "Could not update leave request");
    }
  };

  const handleUpdateComment = async (leaveId: number, comment: string) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          managerComment: comment,
          commentOnly: true 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save comment');
      }

      toast.success("Comment saved successfully");
      if (leaveHooks.fetchLeaves) await leaveHooks.fetchLeaves();
    } catch (error: any) {
      console.error("Error saving comment:", error);
      toast.error(error.message || "Could not save comment");
      throw error;
    }
  };

  const handleUpdateDayLeaveStatus = async (
    leaveId: number, 
    targetDate: string, 
    newType: string, 
    newStatus: string, 
    comment: string
  ) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate, newType, newStatus, comment }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update specific day');
      }

      toast.success("Work status updated and synced!");
      if (leaveHooks.fetchLeaves) await leaveHooks.fetchLeaves();
      if (refreshData) await refreshData(); 
      return true;
    } catch (error: any) {
      console.error("Error splitting leave:", error);
      toast.error(error.message || "Process failed");
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold transition-colors duration-300">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} onOTPLogin={handleOTPLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 transition-colors duration-300">
      <ToastContainer position="top-right" autoClose={3000} />
      <Header
        currentUser={currentUser}
        onLogout={() => setShowLogoutConfirm(true)} 
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={activeNotificationCount}
      />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <StatsCards stats={leavedashboard.stats} />

        {/* ================= EMPLOYEE VIEW ================= */}
        {currentUser.role === "EMPLOYEE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                <h2 className="text-xl font-black tracking-tight text-gray-800 dark:text-white">
                  My Leave Requests
                </h2>
                <button
                  onClick={() => setShowLeaveForm(!showLeaveForm)}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    showLeaveForm ? "bg-gray-100 dark:bg-slate-800 text-gray-500" : "bg-indigo-600 text-white"
                  }`}
                >
                  {showLeaveForm ? "Cancel" : "Apply Leave"}
                </button>
              </div>
              {showLeaveForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <LeaveForm onSubmit={handleLeaveSubmit} onCancel={() => setShowLeaveForm(false)} />
                </div>
              )}
              <EmployeeLeaveTable
                leaves={leaveHooks.leaves as any}
                onDelete={leaveHooks.deleteLeave}
                onUpdate={handleLeaveUpdate}
              />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="flex justify-between items-center h-[74px] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                <h2 className="text-xl font-black tracking-tight text-gray-800 dark:text-white">
                  Work Status Calendar
                </h2>
                <button
                  onClick={() => calendarRef.current?.openToday()}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold transition-all"
                >
                  Update Today's Tasks
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-gray-100 dark:border-slate-800 shadow-sm">
                <EmployeeCalendar ref={calendarRef} />
              </div>
            </div>
          </div>
        )}

        {/* ================= MANAGER VIEW ================= */}
        {currentUser.role === "MANAGER" && (
          <div className="space-y-12">
            <OffboardingAlert 
              employees={employees as any}
              onManageClick={() => setShowUserManagement(true)}
            />

            <div className="space-y-8">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-black tracking-tight text-gray-800 dark:text-white uppercase">
                  AlphaBeta Management
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Manage Users
                  </button>
                  <button
                    onClick={scrollToTaskMonitor}
                    className="px-6 py-2.5 bg-indigo-100 text-indigo-600 font-bold rounded-xl flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Monitor Tasks ↓
                  </button>
                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Upload
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">Awaiting Action</h3>
                <ManagerLeaveTable
                  leaves={leaveHooks.leaves as any} 
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onApprove={(id, comment) => leaveHooks.updateLeaveStatus(id, "APPROVED", comment)}
                  onReject={(id, comment) => leaveHooks.updateLeaveStatus(id, "REJECTED", comment)}
                  onUpdateComment={handleUpdateComment} 
                />
              </div>

              <div ref={taskMonitorRef} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">Complete Work Status Overview</h3>
                {workStatusLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading work status...</div>
                ) : (
                  <EmployeeWorkStatusTable
                    employees={visibleEmployees as any}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                    onUpdateFeedback={updateTaskFeedback}
                    onUpdateDayLeaveStatus={handleUpdateDayLeaveStatus} 
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Confirm Logout</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Are you sure you want to end your session?</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-6 py-4 bg-gray-100 dark:text-black rounded-2xl font-bold">Stay</button>
                <button onClick={handleLogout} className="flex-1 px-6 py-4 bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2"><LogOut size={20} /> Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLeaveForView && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className={`p-8 text-white bg-gradient-to-br ${selectedLeaveForView.status === 'APPROVED' ? 'from-green-600 to-green-700' : selectedLeaveForView.status === 'REJECTED' ? 'from-red-600 to-red-700' : 'from-indigo-600 to-indigo-700'}`}>
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    {selectedLeaveForView.status === 'APPROVED' ? <CheckCircle size={24}/> : selectedLeaveForView.status === 'REJECTED' ? <XCircle size={24}/> : <Clock size={24}/>}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5">Request Insight</p>
                    <h3 className="text-2xl font-black">{selectedLeaveForView.user?.name || "Leave Request"}</h3>
                  </div>
                </div>
                <button onClick={() => setSelectedLeaveForView(null)} className="p-2 bg-white/10 rounded-full transition-all"><X size={20} /></button>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><CalendarIcon size={12} /> Duration</label>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedLeaveForView.days} Working Days</p>
                  <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded uppercase">{selectedLeaveForView.type}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><Clock size={12} /> Status</label>
                  <p className={`text-lg font-black uppercase ${selectedLeaveForView.status === 'APPROVED' ? 'text-green-500' : selectedLeaveForView.status === 'REJECTED' ? 'text-red-500' : 'text-amber-500'}`}>{selectedLeaveForView.status}</p>
                </div>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Service Period</label>
                <p className="font-bold text-slate-700 dark:text-slate-200">{formatDate(selectedLeaveForView.startDate)} <span className="text-slate-300 mx-2">→</span> {formatDate(selectedLeaveForView.endDate)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Reason</label>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl italic text-slate-600 dark:text-slate-400">"{selectedLeaveForView.reason}"</div>
              </div>
              {selectedLeaveForView.managerComment && (
                <div className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <label className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2 mb-2"><MessageSquare size={12} /> Manager Feedback</label>
                  <p className="text-sm text-amber-800 dark:text-amber-400 italic">"{selectedLeaveForView.managerComment}"</p>
                </div>
              )}
              <button onClick={() => setSelectedLeaveForView(null)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl active:scale-95">Done Reading</button>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <NotificationPanel
          recentRequests={currentUser.role === "MANAGER" ? (managerNotifications as any) : (employeeNotifications as any)}
          userRole={currentUser.role as 'MANAGER' | 'EMPLOYEE'}
          onClose={() => setShowNotifications(false)}
        />
      )}
      
      {showBulkUpload && currentUser.role === "MANAGER" && (
        <BulkUploadModal onClose={() => setShowBulkUpload(false)} />
      )}
      {showUserManagement && currentUser.role === "MANAGER" && (
        <UserManagementModal 
          employees={employees as any}
          onAdd={addUser}
          onUpdate={updateUser}
          // REMOVED: Prop 'onDelete' is gone
          onClose={() => setShowUserManagement(false)} 
        />
      )}
    </div>
  );
}