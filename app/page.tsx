"use client";
import React, { useState } from "react";
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-bold">
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
    <div className="min-h-screen bg-gray-50/50">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={
          currentUser.role === "MANAGER" ? pendingLeaves.length : 0
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Top Summary Section */}
        <StatsCards stats={leavedashboard.stats} />

        {/* ================= EMPLOYEE VIEW ================= */}
        {!leaveHooks.loading && currentUser.role === "EMPLOYEE" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Side: Leave Table & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black tracking-tight text-gray-800">My Leave Requests</h2>
                <button
                  onClick={() => setShowLeaveForm(!showLeaveForm)}
                  className={`px-6 py-2 rounded-xl font-bold transition-all ${
                    showLeaveForm 
                    ? "bg-gray-100 text-gray-500 hover:bg-gray-200" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
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

            {/* Right Side: Personal Hollow Calendar */}
            <div className="lg:col-span-5">
               <h2 className="text-xl font-black tracking-tight text-gray-800 mb-6">Work Status Calendar</h2>
               <EmployeeCalendar />
            </div>
          </div>
        )}

        {/* ================= MANAGER VIEW ================= */}
        {!leaveHooks.loading && currentUser.role === "MANAGER" && (
          <div className="space-y-12">
            
            {/* 1. Leave Management Section (Shifted Above) */}
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tight text-gray-800">Leave Management</h2>
                <button
                  onClick={() => setShowBulkUpload(true)}
                  className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload Users
                </button>
              </div>

              {/* Pending Approvals Grid */}
              <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-700">Awaiting Action</h3>
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

              {/* Monthly Overview Section */}
              <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-700">Full Month Attendance History</h3>
                <LeaveTable
                  leaves={leavedashboard.leaves}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* 2. Employee Task Monitoring Section (Shifted Below) */}
            <div className="space-y-6">
               <EmployeeTaskMonitor />
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
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