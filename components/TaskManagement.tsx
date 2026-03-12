'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Building2, Calendar, Clock, Trello, ChevronRight, Search, 
  CheckCircle2, AlertCircle, PlayCircle, CheckSquare, AlertTriangle, 
  History, Timer, RotateCcw, Undo2, MessageSquare, Send, X, User as UserIcon,
  Filter, Briefcase, PlusCircle
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
    INTERFACES
───────────────────────────────────────────────────────── */
interface FlattenedTask {
  id: number;
  company: string;
  task: string;
  status: string;
  employeeName: string;
  employeeId: number;
  date: string; // Original creation date
  updatedAt?: string; // Latest move date
  managerComment?: string;
  commentHistory?: any[]; // Array of {comment, status, timestamp}
}

interface TaskManagementProps {
  allTasks: FlattenedTask[]; 
  currentUser: any;
  onUpdateStatus: (id: number, status: string, comment?: string) => Promise<boolean>;
}

const TaskManagement: React.FC<TaskManagementProps> = ({ allTasks, currentUser, onUpdateStatus }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<FlattenedTask | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');
  const [showCommentBox, setShowCommentBox] = useState(false);

  // ─── FILTERING LOGIC ───
  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(t => {
      const isManager = currentUser.role === 'MANAGER';
      const isOwner = Number(t.employeeId) === Number(currentUser.id);
      if (!isManager && !isOwner) return false;

      const companyMatch = filterCompany === 'all' || t.company === filterCompany;
      const searchMatch = t.task.toLowerCase().includes(searchQuery.toLowerCase());
      return companyMatch && searchMatch;
    });
  }, [allTasks, filterCompany, currentUser, searchQuery]);

  const companies = useMemo(() => {
    return ['all', ...Array.from(new Set(allTasks.map(t => t.company).filter(Boolean)))];
  }, [allTasks]);

  // ─── STYLING CONFIG ───
  const columns = [
    { id: 'ASSIGNED', label: 'Assigned', icon: <Clock size={16} />, color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/50 dark:border-amber-400/30', bg: 'bg-amber-50/90 dark:bg-slate-800/90', dot: 'bg-amber-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', icon: <PlayCircle size={16} />, color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/50 dark:border-blue-400/30', bg: 'bg-blue-50/90 dark:bg-slate-800/90', dot: 'bg-blue-500' },
    { id: 'COMPLETED', label: 'Completed', icon: <CheckSquare size={16} />, color: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/50 dark:border-emerald-400/30', bg: 'bg-emerald-50/90 dark:bg-slate-800/90', dot: 'bg-emerald-500' },
  ];

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(date);
  };

  const handleStatusSubmit = async (status: string) => {
    if (!selectedTask) return;
    
    // Ensure existing comments aren't lost if no new input is provided
    const finalComment = commentInput.trim() !== '' ? commentInput : selectedTask.managerComment;
    
    const success = await onUpdateStatus(selectedTask.id, status, finalComment);
    if (success) {
      setSelectedTask(null);
      setCommentInput('');
      setShowCommentBox(false);
    }
  };

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 px-4 md:px-0">
      
      {/* ─── HEADER ─── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Trello size={24} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Workflow Board</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              <Timer size={12} className="text-indigo-500" /> Live {currentUser.role === 'MANAGER' ? 'Team' : 'My'} Pipeline
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:border-indigo-500 dark:text-slate-200 transition-all" />
          </div>
          <div className="relative flex-1 lg:flex-none lg:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-[10px] font-black uppercase outline-none focus:border-indigo-500 dark:text-slate-200 appearance-none cursor-pointer">
              {companies.map(c => <option key={c} value={c}>{c === 'all' ? 'All Companies' : c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ─── KANBAN GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pb-20">
        {columns.map((col) => {
          const tasksInCol = filteredTasks.filter(t => (t.status?.toUpperCase() || 'ASSIGNED') === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className={`flex items-center gap-2 font-black text-[11px] uppercase tracking-widest ${col.color}`}>{col.icon} {col.label}</div>
                <span className="bg-white dark:bg-slate-700 px-3 py-0.5 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-600 shadow-sm">{tasksInCol.length}</span>
              </div>
              <div className="space-y-4">
                {tasksInCol.map((task) => (
                  <div key={task.id} onClick={() => setSelectedTask(task)}
                    className={`group ${col.bg} p-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-l-[8px] ${col.border}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Company Name:</span>
                        <div className="flex items-center gap-1.5"><Building2 size={12} className="text-indigo-500" /><span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate max-w-[150px]">{task.company}</span></div>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full ${col.dot} shadow-sm animate-pulse`} />
                    </div>
                    <div className="mb-4">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Assigned Task:</span>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: task.task }} />
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 dark:border-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-[9px] font-black border border-slate-100 dark:border-slate-600 dark:text-white">{task.employeeName.charAt(0)}</div>
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{task.employeeName.split(' ')[0]}</span>
                      </div>
                      {task.managerComment && <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg"><MessageSquare size={12} className="text-indigo-600 dark:text-indigo-400" /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── MODAL ─── */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col rounded-l-[3rem] border-l border-slate-100 dark:border-slate-800">
            
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none"><Trello size={20}/></div>
                <div>
                  <h2 className="font-black uppercase tracking-tighter text-xl leading-none dark:text-white">Task Details</h2>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1.5 tracking-widest">Database ID: #{selectedTask.id}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedTask(null); setShowCommentBox(false); setCommentInput(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-white"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <section className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Company Name:</span>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase text-sm"><Building2 size={16}/> {selectedTask.company}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Assigned Task:</span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedTask.task }} />
                </div>
              </section>

              {/* SEPARATE CURRENT FEEDBACK BOX */}
              {selectedTask.managerComment && (
                <section className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-2 tracking-widest"><MessageSquare size={14}/> Current Manager Feedback</h3>
                  <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/50 rounded-[2rem] italic text-xs font-bold text-rose-900 dark:text-rose-200 leading-relaxed shadow-sm">"{selectedTask.managerComment}"</div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Phase Status</p>
                   <p className="text-xs font-black uppercase tracking-tight dark:text-white">{selectedTask.status}</p>
                </div>
                <div className="p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">Assignee</p>
                   <p className="text-xs font-black uppercase tracking-tight dark:text-white">{selectedTask.employeeName}</p>
                </div>
              </div>

              {/* ─── TIMELINE SHOWING ALL HISTORY ─── */}
              <section className="space-y-4 pb-10">
                <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-2 tracking-widest"><History size={14}/> Activity Timeline</h3>
                <div className="space-y-8 border-l-4 border-slate-100 dark:border-slate-800 ml-3 pl-8">
                  
                  {/* Latest Activity (If move exists) */}
                  {selectedTask.updatedAt && (
                    <div className="relative">
                      <div className="absolute -left-[38px] top-1 w-5 h-5 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900 shadow-md" />
                      <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">Latest Pipeline Move</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        {new Date(selectedTask.date) > new Date(selectedTask.updatedAt) ? formatTimestamp(selectedTask.date) : formatTimestamp(selectedTask.updatedAt)}
                      </p>
                    </div>
                  )}

                  {/* SHOW EVERY HISTORY ITEM HERE */}
                  {selectedTask.commentHistory && Array.isArray(selectedTask.commentHistory) && [...selectedTask.commentHistory].reverse().map((entry: any, i: number) => (
                    <div key={i} className="relative animate-in fade-in slide-in-from-left-2">
                       <div className="absolute -left-[38px] top-1 w-5 h-5 rounded-full bg-rose-500 border-4 border-white dark:border-slate-900 shadow-md" />
                       <p className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-400">Feedback Logged</p>
                       <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                          <p className="text-[10px] font-bold italic text-slate-700 dark:text-slate-300">"{entry.comment}"</p>
                          <div className="mt-2 flex items-center justify-between">
                             <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-[8px] font-black text-rose-600 dark:text-rose-400 rounded uppercase">Status: {entry.status}</span>
                             <span className="text-[8px] font-bold text-slate-400 uppercase">{formatTimestamp(entry.timestamp)}</span>
                          </div>
                       </div>
                    </div>
                  ))}

                  <div className="relative">
                    <div className="absolute -left-[38px] top-1 w-5 h-5 rounded-full bg-amber-500 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">Creation Date</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{formatTimestamp(selectedTask.date)}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* ACTION FOOTER */}
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              {currentUser.role === 'MANAGER' ? (
                <div className="space-y-4">
                  {showCommentBox ? (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2">
                       <div className="flex justify-between items-center px-1">
                         <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">New Instructions:</span>
                         <button onClick={() => { setShowCommentBox(false); setCommentInput(''); }} className="text-[9px] font-black text-slate-400 uppercase hover:text-red-500">Cancel</button>
                       </div>
                       <textarea placeholder="Type your feedback here..." value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                         className="w-full bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold outline-none focus:border-indigo-500 dark:text-slate-100 min-h-[100px]" />
                    </div>
                  ) : (
                    <button onClick={() => setShowCommentBox(true)} className="w-full py-4 border-2 border-dashed border-indigo-300 dark:border-indigo-900 rounded-2xl text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all flex items-center justify-center gap-2">
                       <PlusCircle size={14}/> Add Feedback
                    </button>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button onClick={() => handleStatusSubmit('ASSIGNED')} className="flex-1 bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900 text-rose-500 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                      <RotateCcw size={14}/> Reject Submission
                    </button>
                    <button onClick={() => handleStatusSubmit(selectedTask.status)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 dark:shadow-none">
                      <Send size={14}/> Submit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  {selectedTask.status.toUpperCase() !== 'COMPLETED' && (
                    <button onClick={() => handleStatusSubmit(selectedTask.status.toUpperCase() === 'ASSIGNED' ? 'IN_PROGRESS' : 'COMPLETED')} 
                      className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 active:scale-95 transition-all">
                      Change Status <ChevronRight size={20} strokeWidth={3}/>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;