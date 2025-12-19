// app/page.tsx
"use client";
import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaves } from '@/hooks/useLeaves';
import { useDashboardLeaves } from '@/hooks/useDashboardLeave';
import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCard';
import { LeaveForm } from '@/components/LeaveForm';
import { EmployeeLeaveTable } from '@/components/EmployeeLeaveTable';
import { ManagerLeaveTable } from '@/components/ManagerLeaveTable';
import { NotificationPanel } from '@/components/NotificationPanel';
import { BulkUploadModal } from '@/components/BulkUploadModal';
import { LoginForm } from '@/components/LoginForm';
import { LeaveFormData } from '@/type/form';
import LeaveTable from '@/components/LeaveTable';

export default function Home() {
  const { currentUser, loading, login, otpLogin, logout } = useAuth();
  
  // Shared state for month navigation across all tables
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const leaveHooks = useLeaves(currentUser);
  // Dashboad stats will update when currentMonth changes
  const leavedashboard = useDashboardLeaves(currentUser, currentMonth);

  const [showLeaveForm, setShowLeaveForm] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showBulkUpload, setShowBulkUpload] = useState<boolean>(false);

  // Handlers
  const handleLogin = async (email: string, password: string) => await login(email, password);
  const handleOTPLogin = async (email: string, otp: string) => await otpLogin(email, otp);
  const handleLogout = () => { logout(); setShowLeaveForm(false); setShowNotifications(false); setShowBulkUpload(false); };
  const handleLeaveSubmit = async (formData: LeaveFormData) => { await leaveHooks.createLeave(formData); setShowLeaveForm(false); };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <LoginForm onLogin={handleLogin} onOTPLogin={handleOTPLogin} />;

  const pendingLeaves = leaveHooks.leaves.filter(l => l.status === 'PENDING');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentUser={currentUser} 
        onLogout={handleLogout}
        onNotificationClick={() => setShowNotifications(true)}
        notificationCount={currentUser.role === 'MANAGER' ? pendingLeaves.length : 0}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StatsCards stats={leavedashboard.stats} />

        {leaveHooks.loading && <div className="text-center py-8">Loading...</div>}

        {!leaveHooks.loading && currentUser.role === 'EMPLOYEE' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">My Leave Requests</h2>
              <button onClick={() => setShowLeaveForm(!showLeaveForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                {showLeaveForm ? 'Cancel' : 'Apply Leave'}
              </button>
            </div>
            {showLeaveForm && <LeaveForm onSubmit={handleLeaveSubmit} onCancel={() => setShowLeaveForm(false)} />}
            <EmployeeLeaveTable leaves={leaveHooks.leaves} onDelete={leaveHooks.deleteLeave} />
           </div>
        )}

        {/* UPDATED: Manager Table with Month Navigation */}
        {!leaveHooks.loading && currentUser.role === 'MANAGER' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">All Leave Requests</h2>
              <button onClick={() => setShowBulkUpload(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                <Upload className="w-4 h-4" /> Bulk Upload Users
              </button>
            </div>
            
            {/* Pass currentMonth and setCurrentMonth here */}
            <ManagerLeaveTable 
              leaves={leaveHooks.leaves}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onApprove={(id, comment) => leaveHooks.updateLeaveStatus(id, 'APPROVED', comment)}
              onReject={(id, comment) => leaveHooks.updateLeaveStatus(id, 'REJECTED', comment)}
            />
          </div>
        )}

        {/* Dashboard/Calendar Table */}
        {!leaveHooks.loading && currentUser.role === 'MANAGER' && (
          <div className="space-y-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800">Full Month Leave Requests</h2>
            <LeaveTable 
              leaves={leavedashboard.leaves}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />
          </div>
        )}
      </div>

      {showNotifications && currentUser.role === 'MANAGER' && (
        <NotificationPanel recentRequests={pendingLeaves} onClose={() => setShowNotifications(false)} />
      )}
      {showBulkUpload && currentUser.role === 'MANAGER' && (
        <BulkUploadModal onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}