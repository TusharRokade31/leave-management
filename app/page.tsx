"use client";
import React, { useState, useRef, useMemo } from "react";
import { Upload, Users, LogOut, AlertTriangle } from "lucide-react"; 
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
    deleteUser,
    refreshData 
  } = useEmployeeWorkStatus(currentUser, currentMonth);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
  
  // ================= LOGOUT HANDLER (Ensuring clean exit) =================
  const handleLogout = async () => {
    try {
      await logout(); // Call the auth hook logout
      
      // Force UI state resets
      setShowLogoutConfirm(false);
      setShowLeaveForm(false);
      setShowNotifications(false);
      setShowBulkUpload(false);
      setShowUserManagement(false);
      
      toast.info("Logged out successfully");
      
      // Optional: If the hook doesn't redirect, manually refresh to clear all data
      // window.location.reload(); 
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

  const pendingLeaves = leaveHooks.leaves.filter((l) => l.status === "PENDING");

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 transition-colors duration-300">
      <ToastContainer position="top-right" autoClose={3000} />
      <Header
        currentUser={currentUser}
        onLogout={() => setShowLogoutConfirm(true)} 
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={
          currentUser.role === "MANAGER" ? pendingLeaves.length : 0
        }
      />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <StatsCards stats={leavedashboard.stats} />

        {/* ================= EMPLOYEE VIEW ================= */}
        {!leaveHooks.loading && currentUser.role === "EMPLOYEE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
                <h2 className="text-xl font-black tracking-tight text-gray-800 dark:text-white">
                  My Leave Requests
                </h2>
                <button
                  onClick={() => setShowLeaveForm(!showLeaveForm)}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    showLeaveForm
                      ? "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none"
                  }`}
                >
                  {showLeaveForm ? "Cancel" : "Apply Leave"}
                </button>
              </div>

              {showLeaveForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <LeaveForm
                    onSubmit={handleLeaveSubmit}
                    onCancel={() => setShowLeaveForm(false)}
                  />
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
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none"
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
        {!leaveHooks.loading && currentUser.role === "MANAGER" && (
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
                    className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    Manage Users
                  </button>

                  <button
                    onClick={scrollToTaskMonitor}
                    className="px-6 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all active:scale-95 shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    Monitor Tasks ↓
                  </button>

                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100 dark:shadow-none active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Upload
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">
                  Awaiting Action
                </h3>
                <ManagerLeaveTable
                  leaves={leaveHooks.leaves as any} 
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onApprove={(id, comment) =>
                    leaveHooks.updateLeaveStatus(id, "APPROVED", comment)
                  }
                  onReject={(id, comment) =>
                    leaveHooks.updateLeaveStatus(id, "REJECTED", comment)
                  }
                  onUpdateComment={handleUpdateComment} 
                />
              </div>

              <div
                ref={taskMonitorRef}
                className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors"
              >
                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">
                  Complete Work Status Overview (Tasks + Leaves)
                </h3>
                {workStatusLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading work status...
                  </div>
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

      {/* ================= LOGOUT CONFIRMATION POPUP ================= */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertTriangle size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Confirm Logout</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Are you sure you want to end your session? You will need to login again to access your dashboard.</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Stay
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-6 py-4 bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-600 shadow-lg shadow-red-100 dark:shadow-none transition-all active:scale-95"
                >
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showNotifications && currentUser.role === "MANAGER" && (
        <NotificationPanel
          recentRequests={pendingLeaves as any}
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
          onDelete={deleteUser}
          onClose={() => setShowUserManagement(false)} 
        />
      )}
    </div>
  );
}