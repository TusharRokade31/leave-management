"use client";
import React, { useState, useRef, useMemo, useEffect } from "react";
import { 
  Upload, Users, LogOut, AlertTriangle, X, Calendar as CalendarIcon, 
  MessageSquare, Clock, LayoutDashboard, 
  Briefcase, Bell, Menu, ChevronRight, Sun, Moon, ArrowRight, Activity,
  ChevronLeft, PlayCircle, CheckSquare, Trello, Plus
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
import TaskManagement from '@/components/TaskManagement';
import { useTaskManagement } from '@/hooks/useTaskManagement';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
  // ================= HOOKS & STATE =================
  const { currentUser, loading, login, otpLogin, logout } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [taskViewMode, setTaskViewMode] = useState<'day' | 'company'>('day');
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
    hideCompany,
    refreshData 
  } = useEmployeeWorkStatus(currentUser, currentMonth);

  const { allTasks, updateStatus, refreshTasks } = useTaskManagement(employees, currentUser);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeModal, setActiveModal] = useState<'userManagement' | 'bulkUpload' | 'logout' | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeTab === 'tasks' && taskViewMode === 'company' && typeof refreshTasks === 'function') {
      refreshTasks();
    }
  }, [activeTab, taskViewMode, refreshTasks]);

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

  const taskStats = useMemo(() => {
    if (!currentUser || currentUser.role !== "EMPLOYEE" || !allTasks) return null;
    const currentMonthTasks = allTasks.filter(t => {
      const taskDate = new Date(t.date);
      return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
    });
    return {
      assigned: currentMonthTasks.filter(t => (t.status?.toUpperCase() || 'ASSIGNED') === 'ASSIGNED').length,
      inProgress: currentMonthTasks.filter(t => t.status?.toUpperCase() === 'IN_PROGRESS').length,
      completed: currentMonthTasks.filter(t => t.status?.toUpperCase() === 'COMPLETED').length,
    };
  }, [allTasks, currentUser, currentMonth]);

  // ================= HANDLERS =================
  const handleLogout = async () => {
    try {
      await logout();
      setActiveModal(null);
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
      if (leavedashboard.fetchLeaves) await leavedashboard.fetchLeaves(); 
      if (refreshData) await refreshData();

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

  const openFreshDailyLog = () => {
    setActiveTab('tasks');
    setTaskViewMode('day');
    if(window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const openFreshLeaveForm = () => {
    setActiveTab('leaves');
    setShowLeaveForm(false);
    setTimeout(() => {
      setShowLeaveForm(true);
    }, 10);
    if(window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 font-black uppercase tracking-widest text-xs">Loading...</div>;
  if (!currentUser) return <LoginForm onLogin={login} onOTPLogin={otpLogin} />;

  return (
    <div className="flex h-screen bg-[#F9F8F8] dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ToastContainer position="top-right" autoClose={3000} limit={1} theme={isDarkMode ? "dark" : "light"} />

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          position: relative;
          overflow: hidden;
        }
        .animate-shimmer::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          animation: shimmer 1.2s infinite;
        }
      `}</style>

      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:relative inset-y-0 left-0 z-[110] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"}`}>
        <div className="p-6 flex items-center justify-between min-h-[80px]">
          <div className={`flex items-center gap-2 min-w-0 transition-opacity duration-200 ${!isSidebarOpen && "lg:opacity-0 pointer-events-none"}`}>
            <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0">
                <Activity size={18} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-indigo-600 truncate uppercase italic">AlphaBeta</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors hidden lg:block shrink-0 ml-2">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} isOpen={isSidebarOpen} onClick={() => { setActiveTab('dashboard'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <NavItem icon={<Briefcase size={20}/>} label="Tasks" active={activeTab === 'tasks'} isOpen={isSidebarOpen} onClick={() => { setActiveTab('tasks'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          <NavItem icon={<CalendarIcon size={20}/>} label="Leaves" active={activeTab === 'leaves'} isOpen={isSidebarOpen} onClick={() => { setActiveTab('leaves'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} />
          
          {currentUser.role === "MANAGER" && (
            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
              <p className={`text-[10px] font-black text-slate-400 mb-2 px-2 uppercase tracking-widest ${!isSidebarOpen && "hidden"}`}>Admin Access</p>
              <NavItem icon={<Users size={20}/>} label="User Mgmt" isOpen={isSidebarOpen} onClick={() => { setActiveModal('userManagement'); }} />
              <NavItem icon={<Upload size={20}/>} label="Bulk Upload" isOpen={isSidebarOpen} onClick={() => { setActiveModal('bulkUpload'); }} />
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center gap-3 w-full p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Theme</span>}
          </button>
          <button onClick={() => setActiveModal('logout')} className="flex items-center gap-3 w-full p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors">
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0"><Menu size={20} /></button>
            <h1 className="font-black text-[10px] lg:text-xs uppercase tracking-widest truncate">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => setShowNotifications(true)} className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <Bell size={20} />
              {activeNotificationCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full font-black uppercase">{activeNotificationCount}</span>}
            </button>
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-lg shadow-indigo-200 dark:shadow-none">{currentUser.name.charAt(0)}</div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#F9F8F8] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
            
            {activeTab === 'dashboard' && (
              <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none gap-4 animate-in fade-in duration-500">
                <div className="min-w-0">
                  <h2 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic text-slate-800 dark:text-white">Hi, {currentUser.name.split(' ')[0]}!</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Reviewing: <span className="text-indigo-600">{monthLabel}</span></p>
                </div>
                {currentUser.role === "EMPLOYEE" && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"><ChevronLeft size={18} /></button>
                    <div className="px-4 py-1 font-black text-[10px] uppercase tracking-widest text-indigo-600 min-w-[120px] text-center">{monthLabel}</div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all active:scale-90"><ChevronRight size={18} /></button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
                
                {/* ✅ Only StatsCards show the fast shimmer effect during loading */}
                <div className={`${leavedashboard.loading ? 'animate-shimmer opacity-80 pointer-events-none' : ''}`}>
                  <StatsCards stats={leavedashboard.stats as any} role={currentUser.role as any} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  
                  {currentUser.role === "EMPLOYEE" && taskStats && (
                    <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none transition-all hover:shadow-md dark:hover:shadow-none">
                      <h3 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-slate-400 dark:text-slate-500">
                        <Trello size={18} className="text-indigo-600" /> Pipeline Stats
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <TaskOverviewCard label="Assigned" count={taskStats.assigned} icon={<Clock size={16}/>} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20" onClick={() => { setActiveTab('tasks'); setTaskViewMode('company'); }} />
                        <TaskOverviewCard label="In Work" count={taskStats.inProgress} icon={<PlayCircle size={16}/>} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20" onClick={() => { setActiveTab('tasks'); setTaskViewMode('company'); }} />
                        <TaskOverviewCard label="Finished" count={taskStats.completed} icon={<CheckSquare size={16}/>} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20" onClick={() => { setActiveTab('tasks'); setTaskViewMode('company'); }} />
                      </div>
                      <button onClick={() => { setActiveTab('tasks'); setTaskViewMode('company'); }} className="w-full mt-8 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 group border border-slate-200 dark:border-slate-700">
                        Task Board <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  )}

                  <div className="bg-white dark:bg-slate-900 p-6 lg:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none transition-all hover:shadow-md dark:hover:shadow-none">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-slate-400 dark:text-slate-500">
                      <LayoutDashboard size={18} className="text-indigo-600" /> Essential Actions
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {currentUser.role === 'MANAGER' ? (
                        <>
                          <div className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Queue Items</span>
                            <span className="text-xl font-black text-indigo-600">{managerNotifications.length}</span>
                          </div>
                          <button onClick={() => setActiveTab('leaves')} className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all active:scale-95">
                             Manage Team Leaves <ArrowRight size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          <button onClick={openFreshDailyLog} className="py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all active:scale-95">
                             Register Daily Log <Plus size={16} />
                          </button>
                          
                          <div className="p-1 rounded-[1.6rem] bg-gradient-to-r from-indigo-500/20 to-transparent">
                            <button 
                              onClick={openFreshLeaveForm} 
                              className="w-full py-4 bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                               Request Leave <CalendarIcon size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-2 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none flex max-w-sm mx-auto sm:mx-0">
                  <button 
                    onClick={() => setTaskViewMode('day')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taskViewMode === 'day' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <CalendarIcon size={14} /> Day Wise
                  </button>
                  <button 
                    onClick={() => setTaskViewMode('company')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${taskViewMode === 'company' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <LayoutDashboard size={14} /> Company Wise
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden min-h-[500px]">
                  
                  {currentUser.role === 'EMPLOYEE' && taskViewMode === 'day' && (
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="font-black text-[10px] lg:text-xs uppercase tracking-widest italic underline decoration-indigo-500 decoration-4 underline-offset-8">
                        Task Records
                      </h3>
                      
                      <button 
                        onClick={() => calendarRef.current?.openToday()} 
                        className="w-full sm:w-auto px-6 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 dark:shadow-none"
                      >
                        Today
                      </button>
                    </div>
                  )}

                  <div className="p-4 lg:p-6">
                    <div className={taskViewMode === 'company' ? "block" : "hidden"}>
                      <TaskManagement allTasks={allTasks} currentUser={currentUser} onUpdateStatus={updateStatus} />
                    </div>
                    
                    <div className={taskViewMode === 'day' ? "block" : "hidden"}>
                      {currentUser.role === 'MANAGER' ? (
                        workStatusLoading ? (
                          <div className="p-12 text-center text-slate-400 font-black uppercase text-[10px] tracking-widest animate-pulse">
                            Syncing Team Data...
                          </div>
                        ) : (
                          <EmployeeWorkStatusTable 
                            employees={visibleEmployees as any} 
                            companies={companies} 
                            onSaveNewCompany={saveNewCompany} 
                            hideCompany={hideCompany} 
                            currentMonth={currentMonth} 
                            onMonthChange={setCurrentMonth} 
                            onUpdateFeedback={updateTaskFeedback} 
                            onAssignTasks={addAssignedTasks} 
                            onUpdateDayLeaveStatus={handleUpdateDayLeaveStatus} 
                          />
                        )
                      ) : (
                        <div className="p-2 flex justify-center">
                          <EmployeeCalendar ref={calendarRef} employeeId={Number(currentUser.id)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leaves' && (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="font-black text-[10px] lg:text-xs uppercase tracking-widest">Leave Center</h3>
                      {currentUser.role === "EMPLOYEE" && (
                        <button onClick={() => setShowLeaveForm(!showLeaveForm)} className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg dark:shadow-none active:scale-95 ${showLeaveForm ? "bg-red-500 text-white" : "bg-indigo-600 text-white"}`}>
                          {showLeaveForm ? "Close Form" : "Request Leave"}
                        </button>
                      )}
                    </div>
                    {showLeaveForm && (
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <LeaveForm 
                          onSubmit={handleLeaveSubmit} 
                          onCancel={() => setShowLeaveForm(false)} 
                          existingLeaves={leaveHooks.leaves} 
                        />
                      </div>
                    )}
                    <div className="p-4 overflow-x-auto">
                      {currentUser.role === "EMPLOYEE" ? (
                        <EmployeeLeaveTable 
                          leaves={leaveHooks.leaves as any} 
                          onDelete={leaveHooks.deleteLeave} 
                          onUpdate={handleLeaveUpdate} 
                        />
                      ) : (
                        <ManagerLeaveTable 
                          leaves={leaveHooks.leaves as any} 
                          currentMonth={currentMonth} 
                          onMonthChange={setCurrentMonth} 
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

      {activeModal === 'logout' && <LogoutModal onCancel={() => setActiveModal(null)} onConfirm={handleLogout} />}
      {showNotifications && <NotificationPanel recentRequests={(currentUser.role === "MANAGER" ? managerNotifications : employeeNotifications) as any} userRole={currentUser.role as any} onClose={() => setShowNotifications(false)} />}
      {activeModal === 'bulkUpload' && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"><BulkUploadModal onClose={() => setActiveModal(null)} /></div>}
      {activeModal === 'userManagement' && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm"><UserManagementModal employees={employees as any} onAdd={addUser} onUpdate={updateUser} onClose={() => setActiveModal(null)} /></div>}
    </div>
  );
}

function NavItem({ icon, label, active = false, isOpen = true, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all group shrink-0 ${active ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 shadow-sm dark:shadow-none" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"} ${!isOpen ? "justify-center" : "justify-start"}`}>
      <span className={`${active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"}`}>{icon}</span>
      {isOpen && <span className="text-[10px] font-black uppercase tracking-widest truncate">{label}</span>}
    </button>
  );
}

function TaskOverviewCard({ label, count, icon, color, bg, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-2 transition-all hover:border-indigo-400 dark:hover:border-indigo-600 hover:scale-[1.02] active:scale-95 ${bg}`}>
      <div className={`mb-3 p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm dark:shadow-none ${color}`}>{icon}</div>
      <span className="text-xl font-black mb-1 leading-none text-slate-900 dark:text-white">{count}</span>
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
    </button>
  );
}

function LogoutModal({ onCancel, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
      {/* Changed w-full max-sm to max-w-sm to constrain the width properly */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-2xl dark:shadow-none text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-black uppercase tracking-widest mb-2 text-slate-800 dark:text-white">
          End Session?
        </h3>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8 leading-relaxed px-4">
          Are you sure you want to sign out of the AlphaBeta portal?
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-colors"
          >
            Wait, No
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}