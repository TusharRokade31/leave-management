"use client";
import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, User, LogOut, Bell, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaves } from '@/hooks/useLeaves';
import { useDashboardLeaves } from '@/hooks/useDashboardLeave';
import { LoginForm } from '@/components/LoginForm';
import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCard';
import { LeaveForm } from '@/components/LeaveForm';
import { EmployeeLeaveTable } from '@/components/EmployeeLeaveTable';
import { ManagerLeaveTable } from '@/components/ManagerLeaveTable';
import { NotificationPanel } from '@/components/NotificationPanel';
import { BulkUploadModal } from '@/components/BulkUploadModal';
import { LeaveFormData } from '@/type/form';
import LeaveTable from '@/components/LeaveTable';

export default function Home() {
  const { currentUser, loading, login, otpLogin, logout } = useAuth();
  const leaveHooks = useLeaves(currentUser);
  const leavedashboard = useDashboardLeaves(currentUser);
  const [showLeaveForm, setShowLeaveForm] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showBulkUpload, setShowBulkUpload] = useState<boolean>(false);

  const handleLogin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    return await login(email, password);
  };

  const handleOTPLogin = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
    return await otpLogin(email, otp);
  };

  const handleLogout = (): void => {
    logout();
    setShowLeaveForm(false);
    setShowNotifications(false);
    setShowBulkUpload(false);
  };

  const handleLeaveSubmit = async (formData: LeaveFormData): Promise<void> => {
    await leaveHooks.createLeave(formData);
    setShowLeaveForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} onOTPLogin={handleOTPLogin} />;
  }

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
        <StatsCards stats={leaveHooks.stats} />

        {leaveHooks.loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {!leaveHooks.loading && currentUser.role === 'EMPLOYEE' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">My Leave Requests</h2>
              <button
                onClick={() => setShowLeaveForm(!showLeaveForm)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {showLeaveForm ? 'Cancel' : 'Apply Leave'}
              </button>
            </div>

            {showLeaveForm && (
              <LeaveForm 
                onSubmit={handleLeaveSubmit} 
                onCancel={() => setShowLeaveForm(false)}
              />
            )}

            <EmployeeLeaveTable 
              leaves={leaveHooks.leaves} 
              onDelete={leaveHooks.deleteLeave}
            />
          </div>
        )}

        {!leaveHooks.loading && currentUser.role === 'MANAGER' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">All Leave Requests</h2>
              <button
                onClick={() => setShowBulkUpload(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload Users
              </button>
            </div>
            
            <ManagerLeaveTable 
              leaves={leaveHooks.leaves}
              onApprove={(id) => leaveHooks.updateLeaveStatus(id, 'APPROVED')}
              onReject={(id) => leaveHooks.updateLeaveStatus(id, 'REJECTED')}
            />
          </div>
        )}

        {!leaveHooks.loading && currentUser.role === 'MANAGER' && (
          <div className="space-y-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800">Full Month Leave Requests</h2>
            
            <LeaveTable 
              leaves={leavedashboard.leaves}
            />
          </div>
        )}
      </div>

      {showNotifications && currentUser.role === 'MANAGER' && (
        <NotificationPanel 
          recentRequests={pendingLeaves}
          onClose={() =>setShowNotifications(false)}
/>
)}
  {showBulkUpload && currentUser.role === 'MANAGER' && (
    <BulkUploadModal onClose={() => setShowBulkUpload(false)} />
  )}
</div>
);
}