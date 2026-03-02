"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { 
  Upload, Users, LogOut, AlertTriangle, X, Calendar as CalendarIcon, 
  MessageSquare, CheckCircle, XCircle, Clock, LayoutDashboard, 
  Briefcase, Bell, Menu, ChevronRight, Sun, Moon, ArrowRight, Activity,
  ChevronLeft
} from "lucide-react"; 
import { useAuth } from "@/hooks/useAuth";
import { useLeaves } from "@/hooks/useLeaves";
import { useDashboardLeaves } from "@/hooks/useDashboardLeave";
import { useEmployeeWorkStatus } from "@/hooks/useEmployeeWorkStatus";
import { StatsCards } from "@/components/StatsCard";
import { LeaveForm } from "@/components/LeaveForm";
import { EmployeeLeaveTable } from "@/components/EmployeeLeaveTable";
import { ManagerLeaveTable } from "@/components/ManagerLeaveTable";
import { NotificationPanel } from "@/components/NotificationPanel";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { UserManagementModal } from "@/components/UserManagementModal";
import { LoginForm } from "@/components/LoginForm";
import { LeaveFormData } from "@/type/form";
import EmployeeWorkStatusTable from "@/components/EmployeeWorkStatusTable";
import { EmployeeCalendar } from "@/components/EmployeeCalendar";
import { ToastContainer, toast } from 'react-toastify';

export default function Home() {
  // ================= HOOKS & STATE =================
  const { currentUser, loading, login, otpLogin, logout } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Responsive sidebar state - Open by default on Desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'leaves'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const calendarRef = useRef<any>(null);

  const leaveHooks = useLeaves(currentUser);
  const leavedashboard = useDashboardLeaves(currentUser, currentMonth);
  
  const { 
    employees, 
    loading: workStatusLoading, 
    updateTaskFeedback,
    addAssignedTasks,
    addUser,
    updateUser,
    companies,
    saveNewCompany,
    refreshData 
  } = useEmployeeWorkStatus(currentUser, currentMonth);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Single state to manage exclusive modals
  const [activeModal, setActiveModal] = useState<'userManagement' | 'bulkUpload' | 'logout' | null>(null);

  // Persistence: Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Persistence: Update document and localStorage on toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Initialize sidebar for desktop on mount and handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ================= LOGIC & MEMOS =================
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
    return currentUser.role === "MANAGER" ? managerNotifications.length : employeeNotifications.length;
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

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [currentMonth]);

  // ================= HANDLERS =================
  const handleLogout = async () => {
    try {
      await logout();
      setActiveModal(null);
      toast.info("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const handleLeaveSubmit = async (formData: LeaveFormData) => {
    await leaveHooks.createLeave(formData);
    setShowLeaveForm(false);
    setActiveTab('leaves');
  };

  const handleLeaveUpdate = async (leaveId: number, updatedData: any) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!response.ok) throw new Error('Failed to update leave');
      toast.success("Updated successfully!");
      if (leaveHooks.fetchLeaves) await leaveHooks.fetchLeaves();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateComment = async (leaveId: number, comment: string) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerComment: comment, commentOnly: true }),
      });
      if (!response.ok) throw new Error('Failed to save comment');
      toast.success("Comment saved");
      if (leaveHooks.fetchLeaves) await leaveHooks.fetchLeaves();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateDayLeaveStatus = async (leaveId: number, targetDate: string, newType: string, newStatus: string, comment: string) => {
    try {
      const response = await fetch(`/api/leaves/${leaveId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate, newType, newStatus, comment }),
      });
      if (!response.ok) throw new Error('Failed to update day');
      toast.success("Status synced!");
      if (leaveHooks.fetchLeaves) await leaveHooks.fetchLeaves();
      if (refreshData) await refreshData(); 
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-bold">Loading...</div>;
  if (!currentUser) return <LoginForm onLogin={login} onOTPLogin={otpLogin} />;

  return (
    <div className="flex h-screen bg-[#F9F8F8] dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-[110] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-6 flex items-center justify-between min-h-[80px]">
          <div className={`flex items-center gap-2 min-w-0 transition-opacity duration-200 ${!isSidebarOpen && "lg:opacity-0 pointer-events-none"}`}>
            <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0">
               <Activity size={18} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-indigo-600 truncate">ALPHABETA</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors hidden lg:block shrink-0 ml-2">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors lg:hidden shrink-0"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} isOpen={isSidebarOpen} onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <NavItem icon={<Briefcase size={20}/>} label="Tasks" active={activeTab === 'tasks'} isOpen={isSidebarOpen} onClick={() => { setActiveTab('tasks'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <NavItem icon={<CalendarIcon size={20}/>} label="Leaves" active={activeTab === 'leaves'} isOpen={isSidebarOpen} onClick={() => { setActiveTab('leaves'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          
          {currentUser.role === "MANAGER" && (
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <p className={`text-[10px] font-bold text-slate-400 mb-2 px-2 uppercase ${!isSidebarOpen && "hidden"}`}>Admin</p>
              <NavItem icon={<Users size={20}/>} label="User Mgmt" isOpen={isSidebarOpen} onClick={() => { setActiveModal('userManagement'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
              <NavItem icon={<Upload size={20}/>} label="Bulk Upload" isOpen={isSidebarOpen} onClick={() => { setActiveModal('bulkUpload'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center gap-3 w-full p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors justify-center lg:justify-start">
            <div className="shrink-0">{isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}</div>
            {isSidebarOpen && <span className="text-sm font-bold truncate">Dark Mode</span>}
          </button>
          <button onClick={() => setActiveModal('logout')} className="flex items-center gap-3 w-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors justify-center lg:justify-start">
            <div className="shrink-0"><LogOut size={20} /></div>
            {isSidebarOpen && <span className="text-sm font-bold truncate">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"><Menu size={20} /></button>
            <h1 className="font-bold text-base lg:text-lg capitalize truncate shrink-0">{activeTab}</h1>
            <ChevronRight size={14} className="text-slate-400 hidden sm:block shrink-0" />
            <span className="text-slate-500 text-sm font-medium hidden sm:block truncate max-w-[120px]">{currentUser.name}</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <button onClick={() => setShowNotifications(true)} className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Bell size={20} />
              {activeNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full font-bold">
                  {activeNotificationCount}
                </span>
              )}
            </button>
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">{currentUser.name.charAt(0)}</div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#F9F8F8] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            
            {/* WELCOME CONTAINER: ONLY VISIBLE ON DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm gap-4 animate-in fade-in duration-500">
                <div className="min-w-0">
                  <h2 className="text-2xl lg:text-3xl font-black tracking-tight truncate">Welcome, {currentUser.name.split(' ')[0]}!</h2>
                  <p className="text-slate-500 text-xs sm:text-sm font-bold uppercase tracking-widest mt-1">Viewing Records for <span className="text-indigo-600">{monthLabel}</span></p>
                </div>
                
                {/* MONTH SELECTOR: ONLY FOR EMPLOYEES */}
                {currentUser.role === "EMPLOYEE" && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-xl transition-all active:scale-90"><ChevronLeft size={20} /></button>
                    <div className="px-4 py-1 font-black text-xs uppercase tracking-tighter text-indigo-600 min-w-[120px] text-center">{monthLabel}</div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded-xl transition-all active:scale-90"><ChevronRight size={20} /></button>
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 1: DASHBOARD ================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
                <StatsCards stats={leavedashboard.stats} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <h3 className="text-lg lg:text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-tight">
                      <Clock size={20} className="text-indigo-600" /> 
                      {currentUser.role === 'MANAGER' ? 'Approval Queue' : 'Quick Actions'}
                    </h3>
                    <div className="space-y-4">
                      {currentUser.role === 'MANAGER' ? (
                        <>
                          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <span className="text-sm font-medium">Pending Requests</span>
                            <span className="font-black text-indigo-600">{managerNotifications.length}</span>
                          </div>
                          <button onClick={() => setActiveTab('leaves')} className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md uppercase text-xs tracking-widest">
                            Review Portal <ArrowRight size={16} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setActiveTab('tasks')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none uppercase text-xs tracking-widest">
                             Open Work Log <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: TASKS ================= */}
            {activeTab === 'tasks' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-base lg:text-lg uppercase tracking-tight italic tracking-tighter">
                      {currentUser.role === 'MANAGER' ? 'Team Performance Hub' : 'Daily Task Log'}
                    </h3>
                    {currentUser.role === 'EMPLOYEE' && (
                      <button onClick={() => calendarRef.current?.openToday()} className="w-full sm:w-auto px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-black uppercase rounded-lg transition-colors hover:bg-indigo-100 border border-indigo-100 dark:border-indigo-800">Go to Today</button>
                    )}
                  </div>
                  <div className="p-2 lg:p-4 overflow-x-auto min-h-[400px]">
                     {currentUser.role === 'MANAGER' ? (
                        workStatusLoading ? <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Aggregating Team Data...</div> : (
                          <EmployeeWorkStatusTable 
                            employees={visibleEmployees as any} companies={companies} onSaveNewCompany={saveNewCompany}
                            currentMonth={currentMonth} onMonthChange={setCurrentMonth} 
                            onUpdateFeedback={updateTaskFeedback}
                            onAssignTasks={addAssignedTasks} 
                            onUpdateDayLeaveStatus={handleUpdateDayLeaveStatus} 
                          />
                        )
                    ) : (
                      <div className="p-2 lg:p-6 flex justify-center overflow-x-auto"><EmployeeCalendar ref={calendarRef} /></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 3: LEAVES ================= */}
            {activeTab === 'leaves' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="font-bold text-base lg:text-lg uppercase tracking-tighter">Leave Operations</h3>
                      {currentUser.role === "EMPLOYEE" && (
                        <button onClick={() => setShowLeaveForm(!showLeaveForm)} className={`w-full sm:w-auto px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-md active:scale-95 ${showLeaveForm ? "bg-red-500 text-white shadow-red-100" : "bg-indigo-600 text-white shadow-indigo-100"}`}>
                          {showLeaveForm ? "Cancel Entry" : "Apply Leave"}
                        </button>
                      )}
                    </div>
                    {showLeaveForm && (
                      <div className="p-4 lg:p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <LeaveForm onSubmit={handleLeaveSubmit} onCancel={() => setShowLeaveForm(false)} />
                      </div>
                    )}
                    <div className="p-2 overflow-x-auto">
                      {currentUser.role === "EMPLOYEE" ? (
                        <EmployeeLeaveTable leaves={leaveHooks.leaves as any} onDelete={leaveHooks.deleteLeave} onUpdate={handleLeaveUpdate} />
                      ) : (
                        <ManagerLeaveTable 
                          leaves={leaveHooks.leaves as any} currentMonth={currentMonth} onMonthChange={setCurrentMonth}
                          onApprove={(id, comment) => leaveHooks.updateLeaveStatus(id, "APPROVED", comment)}
                          onReject={(id, comment) => leaveHooks.updateLeaveStatus(id, "REJECTED", comment)}
                          onUpdateComment={handleUpdateComment} 
                        />
                      )}
                    </div>
                  </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* OVERLAYS & MODALS */}
      {activeModal === 'logout' && (
        <LogoutModal onCancel={() => setActiveModal(null)} onConfirm={handleLogout} />
      )}
      
      {showNotifications && (
        <NotificationPanel 
          recentRequests={(currentUser.role === "MANAGER" ? managerNotifications : employeeNotifications) as any} 
          userRole={currentUser.role as any} 
          onClose={() => setShowNotifications(false)} 
        />
      )}
      
      {activeModal === 'bulkUpload' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <BulkUploadModal onClose={() => setActiveModal(null)} />
        </div>
      )}
      
      {activeModal === 'userManagement' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <UserManagementModal 
            employees={employees as any} 
            onAdd={addUser} 
            onUpdate={updateUser} 
            onClose={() => setActiveModal(null)} 
          />
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false, isOpen = true, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all group shrink-0
        ${active ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}
        ${!isOpen ? "justify-center" : "justify-start"}
      `}
    >
      <span className={`${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}>{icon}</span>
      {isOpen && <span className="text-[10px] font-black uppercase tracking-widest truncate">{label}</span>}
    </button>
  );
}

function LogoutModal({ onCancel, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] lg:rounded-[2.5rem] p-6 lg:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl text-center animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 lg:w-16 lg:h-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6 shrink-0"><AlertTriangle size={24} className="lg:w-8 lg:h-8" /></div>
        <h3 className="text-lg lg:text-xl font-bold mb-2 uppercase tracking-tighter">Log Out?</h3>
        <p className="text-slate-500 text-xs lg:text-sm mb-6 lg:mb-8 font-medium leading-relaxed">Sign out of AlphaBeta Management system.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 lg:py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-xs lg:text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 lg:py-3 bg-red-500 text-white rounded-xl font-bold text-xs lg:text-sm transition-transform active:scale-95 shadow-md">Logout</button>
        </div>
      </div>
    </div>
  );
}