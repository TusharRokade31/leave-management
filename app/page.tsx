"use client";
import React, { useState, useRef } from "react"; 
import { Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeaves } from "@/hooks/useLeaves";
import { useDashboardLeaves } from "@/hooks/useDashboardLeave";
import { Header } from "@/components/Header";
import { StatsCards } from "@/components/StatsCard";
import { LeaveForm } from "@/components/LeaveForm";
import { EmployeeLeaveTable } from "@/components/EmployeeLeaveTable";
import { ManagerLeaveTable } from "@/components/ManagerLeaveTable";
import { NotificationPanel } from "@/components/NotificationPanel";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { LoginForm } from "@/components/LoginForm";
import { LeaveFormData } from "@/type/form";
import LeaveTable from "@/components/LeaveTable";
import { EmployeeCalendar } from "@/components/EmployeeCalendar";
import { EmployeeTaskMonitor } from "@/components/EmployeeTaskMonitor";

export default function Home() {
  const { currentUser, loading, login, otpLogin, logout } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Refs
  const taskMonitorRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<any>(null); // Added for the Today button logic

  // Scroll Function
  const scrollToTaskMonitor = () => {
    taskMonitorRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const leaveHooks = useLeaves(currentUser);
  const leavedashboard = useDashboardLeaves(currentUser, currentMonth);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const handleLogin = async (email: string, password: string) =>
    await login(email, password);

  const handleOTPLogin = async (email: string, otp: string) =>
    await otpLogin(email, otp);

  const handleLogout = () => {
    logout();
    setShowLeaveForm(false);
    setShowNotifications(false);
    setShowBulkUpload(false);
  };

  const handleLeaveSubmit = async (formData: LeaveFormData) => {
    await leaveHooks.createLeave(formData);
    setShowLeaveForm(false);
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

  const pendingLeaves = leaveHooks.leaves.filter(
    (l) => l.status === "PENDING"
  );

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 transition-colors duration-300">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
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
            {/* Left Column: Leave Requests */}
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
                leaves={leaveHooks.leaves}
                onDelete={leaveHooks.deleteLeave}
              />
            </div>

            {/* Right Column: Calendar */}
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

              {/* Calendar Container */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border border-gray-100 dark:border-slate-800 shadow-sm">
                <EmployeeCalendar ref={calendarRef} />
              </div>
            </div>
          </div>
        )}

        {/* ================= MANAGER VIEW ================= */}
        {!leaveHooks.loading && currentUser.role === "MANAGER" && (
          <div className="space-y-12">
            <div className="space-y-8">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-black tracking-tight text-gray-800 dark:text-white uppercase">
                  Leave Management
                </h2>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={scrollToTaskMonitor}
                    className="px-6 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all active:scale-95 shadow-sm"
                  >
                    Monitor Tasks ↓
                  </button>

                  <button
                    onClick={() => setShowBulkUpload(true)}
                    className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100 dark:shadow-none active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Bulk Upload Users
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">Awaiting Action</h3>
                <ManagerLeaveTable
                  leaves={leaveHooks.leaves}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  onApprove={(id, comment) =>
                    leaveHooks.updateLeaveStatus(id, "APPROVED", comment)
                  }
                  onReject={(id, comment) =>
                    leaveHooks.updateLeaveStatus(id, "REJECTED", comment)
                  }
                />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
                <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">Full Month Attendance History</h3>
                <LeaveTable
                  leaves={leavedashboard.leaves}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </div>
            </div>

            <hr className="border-gray-100 dark:border-slate-800" />

            <div ref={taskMonitorRef} className="space-y-6 scroll-mt-10">
                <EmployeeTaskMonitor />
            </div>
          </div>
        )}
      </div>

      {showNotifications && currentUser.role === "MANAGER" && (
        <NotificationPanel
          recentRequests={pendingLeaves}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showBulkUpload && currentUser.role === "MANAGER" && (
        <BulkUploadModal onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}