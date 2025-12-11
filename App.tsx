
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Layout, 
    Calendar, 
    User, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    Loader2,
    Filter,
    X,
    CalendarDays,
    RefreshCw,
    CalendarCheck,
    Moon,
    Sun,
    MoreHorizontal,
    Copy,
    ExternalLink,
    Check,
    Briefcase,
    AlertCircle,
    CheckCircle2,
    Code
} from 'lucide-react';

import { OrgTree } from './components/OrgTree';
import { TaskCard } from './components/TaskCard';
import { StatsPanel } from './components/StatsPanel';
import { DailyTaskPopup } from './components/DailyTaskPopup';
import { generateCenteredDateColumns, isToday, getTodayStr } from './utils/dateUtils';
import { fetchPlan, fetchRelation } from './services/apiService';
import { DateColumn, PlanResponse, RelationResponse, EmployeePlan, DailyPlan, Task } from './types';

// Key for LocalStorage
const STORAGE_USER_KEY = 'qodin_my_rtx';
const STORAGE_USER_PATH_KEY = 'qodin_my_path';
const STORAGE_LAST_PATH = 'qodin_last_path';
const STORAGE_THEME_KEY = 'qodin_theme_dark';

// Background Images
const BG_LIGHT = "https://images.unsplash.com/photo-1491002052546-bf38f186af56?q=80&w=2500&auto=format&fit=crop"; 
const BG_DARK = "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2500&auto=format&fit=crop"; 

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const STATUSES = ['coding', 'support', 'planning', 'review', 'done', '进行中', '未开始']; 

const RANGE_OPTIONS = [
    { label: '±3', value: 3 },
    { label: '±5', value: 5 },
    { label: '±7', value: 7 },
    { label: '±14', value: 14 },
];

const ROW_HEIGHT = 72; 

interface MergedTaskBlock {
    task: Task;
    startColIndex: number; 
    duration: number; 
    rowIndex: number;
}

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    task: Task | null;
}

function App() {
  // --- State ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [relation, setRelation] = useState<RelationResponse | null>(null);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);
  
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem(STORAGE_THEME_KEY) === 'true';
      }
      return false;
  });

  // View State
  const [selectedPath, setSelectedPath] = useState<string>('技术中心');
  const [myRtxId, setMyRtxId] = useState<string>('');
  const [filterText, setFilterText] = useState('');
  const [onlyMe, setOnlyMe] = useState(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(() => {
      if (typeof window !== 'undefined') {
          return window.innerWidth >= 1024; // Only open by default on Desktop
      }
      return true;
  });

  const [showWeekends, setShowWeekends] = useState(false); 
  const [centerDate, setCenterDate] = useState<string>(getTodayStr());
  const [rangeOffset, setRangeOffset] = useState<number>(3); 

  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, task: null });
  const [copied, setCopied] = useState(false);

  // Welcome Popup State
  const [welcomeTasks, setWelcomeTasks] = useState<Task[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  // Ref to track if we've already shown the welcome message in this session (prevent on refresh/tab switch)
  const hasInitialCheckDone = useRef(false);

  // Computed Date Columns
  const dateColumns: DateColumn[] = useMemo(() => {
      // Pass skipWeekends = !showWeekends
      return generateCenteredDateColumns(centerDate, rangeOffset, !showWeekends);
  }, [centerDate, rangeOffset, showWeekends]);

  // --- Effects ---

  // 0. Theme Effect
  useEffect(() => {
    if (darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_THEME_KEY, String(darkMode));
  }, [darkMode]);

  // 1. Initial Load
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_USER_KEY);
    const savedPath = localStorage.getItem(STORAGE_LAST_PATH);
    if (savedUser) setMyRtxId(savedUser);
    
    // Priority: If saved path exists, use it. This positions the tree automatically.
    if (savedPath) {
        setSelectedPath(savedPath);
    } else {
        // If no saved path, default is '技术中心'
        setSelectedPath('技术中心');
    }

    const init = async () => {
      try {
        const relData = await fetchRelation('技术中心');
        setRelation(relData);
      } catch (e) {
        console.error("Failed to load org tree", e);
      }
    };
    init();
  }, []);

  // 2. Fetch Plan
  useEffect(() => {
    if (!selectedPath) return;
    localStorage.setItem(STORAGE_LAST_PATH, selectedPath);
    loadPlanData(false);
  }, [selectedPath]);

  // 3. Logic to show Welcome Popup on Session Start
  // Independent of main planData to ensure it shows even if we are on a different tab initially
  useEffect(() => {
      if (!myRtxId || hasInitialCheckDone.current) return;

      const checkPopup = async () => {
          hasInitialCheckDone.current = true; // Mark done immediately to prevent re-runs
          
          const savedUserPath = localStorage.getItem(STORAGE_USER_PATH_KEY);
          // If we have a saved "home" path for the user, check that. Otherwise check current selectedPath.
          const pathToCheck = savedUserPath || selectedPath;

          try {
              // Fetch data directly (bypassing state to avoid UI flicker if just checking background)
              // This is cached by apiService so it's cheap if it matches current view
              const data = await fetchPlan(pathToCheck);
              const today = getTodayStr();
              const me = data.work_plan.employees.find(e => e.rtx_id === myRtxId);
              
              if (me && me.daily_plans[today] && me.daily_plans[today].tasks.length > 0) {
                  setWelcomeTasks(me.daily_plans[today].tasks);
                  setShowWelcome(true);
              }
          } catch (e) {
              console.error("Popup check failed", e);
          }
      };
      
      checkPopup();
  }, [myRtxId]); // Run once when myRtxId is loaded/stable


  // 4. Click outside context menu to close
  useEffect(() => {
      const handleClick = () => {
          if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
      };
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const loadPlanData = async (forceRefresh: boolean = false) => {
    if (!planData) {
        setLoading(true);
    }
    try {
      const data = await fetchPlan(selectedPath, forceRefresh);
      setPlanData(data);
    } catch (e) {
      console.error("Failed to load plan", e);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
      setRefreshing(true);
      await loadPlanData(true);
      setRefreshing(false);
  };

  const handleBackToToday = () => {
      setCenterDate(getTodayStr());
  };

  // --- Handlers ---
  const handleSetMe = (rtxId: string) => {
    setMyRtxId(rtxId);
    localStorage.setItem(STORAGE_USER_KEY, rtxId);
    // Remember the organization path where "Me" was found
    localStorage.setItem(STORAGE_USER_PATH_KEY, selectedPath);
  };

  const clearMe = () => {
      setMyRtxId('');
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_USER_PATH_KEY);
      setOnlyMe(false);
  };

  const handleToggleMe = () => {
    if (!onlyMe) {
        // Turning "Only Me" ON
        const savedPath = localStorage.getItem(STORAGE_USER_PATH_KEY);
        // If we have a saved home path and we are not currently there, switch tabs
        if (savedPath && savedPath !== selectedPath) {
            setSelectedPath(savedPath);
        }
        setOnlyMe(true);
    } else {
        // Turning OFF
        setOnlyMe(false);
    }
  };

  const toggleFilter = (list: string[], item: string, setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const clearFilters = () => {
      setStatusFilters([]);
      setPriorityFilters([]);
  };

  const shiftDate = (direction: 'prev' | 'next') => {
      const d = new Date(centerDate);
      
      let jumpDays = (rangeOffset * 2) + 1;
      
      if (!showWeekends) {
          // Approximate: 5 workdays = 7 calendar days
          jumpDays = Math.ceil(jumpDays * (7/5));
      }
      
      d.setDate(d.getDate() + (direction === 'next' ? jumpDays : -jumpDays));
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const newDate = `${year}-${month}-${day}`;
      
      if (planData?.work_plan?.period) {
          const { start_date, end_date } = planData.work_plan.period;
          if (newDate < start_date) { setCenterDate(start_date); return; }
          if (newDate > end_date) { setCenterDate(end_date); return; }
      }
      setCenterDate(newDate);
  };

  // Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
      e.preventDefault();
      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          task
      });
      setCopied(false);
  };

  const handleCopyLink = () => {
      if (!contextMenu.task?.task_id) return;
      const url = `http://pmo.corp.qunar.com/browse/${contextMenu.task.task_id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Don't close immediately so user sees "Copied" feedback
  };

  const handleOpenLink = () => {
    if (!contextMenu.task?.task_id) return;
    const url = `http://pmo.corp.qunar.com/browse/${contextMenu.task.task_id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setContextMenu({ ...contextMenu, visible: false });
  };

  // --- Filtering & Merging Logic ---
  const filteredEmployees = useMemo(() => {
      if (!planData?.work_plan?.employees) return [];
      let emps = planData.work_plan.employees;

      if (onlyMe && myRtxId) {
          emps = emps.filter(e => e.rtx_id === myRtxId);
      } else if (myRtxId) {
          emps = [...emps].sort((a, b) => {
              if (a.rtx_id === myRtxId) return -1;
              if (b.rtx_id === myRtxId) return 1;
              return 0;
          });
      }

      const lowerFilterText = filterText.toLowerCase().trim();
      const hasTaskFilters = statusFilters.length > 0 || priorityFilters.length > 0;
      const visibleDateKeys = dateColumns.map(d => d.dateStr);

      return emps.reduce((acc, emp) => {
          const empMatchesSearch = !lowerFilterText || 
                                   emp.name.toLowerCase().includes(lowerFilterText) || 
                                   emp.rtx_id.toLowerCase().includes(lowerFilterText);

          const newDailyPlans: Record<string, DailyPlan> = {};
          let hasVisibleTasks = false;

          visibleDateKeys.forEach(dateKey => {
              const dayPlan = emp.daily_plans[dateKey];
              if (!dayPlan) return;

              const visibleTasks = dayPlan.tasks.filter(t => {
                  const matchPriority = priorityFilters.length === 0 || priorityFilters.includes(t.priority);
                  const matchStatus = statusFilters.length === 0 || statusFilters.includes(t.status);
                  if (!matchPriority || !matchStatus) return false;

                  if (!lowerFilterText) return true;
                  if (empMatchesSearch) return true;

                  return t.title.toLowerCase().includes(lowerFilterText) ||
                         t.task_id.toLowerCase().includes(lowerFilterText) ||
                         t.type.toLowerCase().includes(lowerFilterText);
              });

              if (visibleTasks.length > 0) {
                  hasVisibleTasks = true;
                  newDailyPlans[dateKey] = { task_count: visibleTasks.length, tasks: visibleTasks };
              }
          });

          const filtersActive = !!lowerFilterText || hasTaskFilters;
          
          if (!filtersActive) {
             acc.push(emp);
          } else if (hasVisibleTasks) {
             acc.push({ ...emp, daily_plans: newDailyPlans });
          } else if (empMatchesSearch && !hasTaskFilters) {
             acc.push({ ...emp, daily_plans: {} });
          }

          return acc;
      }, [] as EmployeePlan[]);

  }, [planData, filterText, onlyMe, myRtxId, statusFilters, priorityFilters, dateColumns]);

  const getMergedTasks = (emp: EmployeePlan, columns: DateColumn[]): MergedTaskBlock[] => {
      const merged: MergedTaskBlock[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      const activeTaskMap = new Map<string, number>();

      columns.forEach((col, colIndex) => {
          const dailyTasks = emp.daily_plans[col.dateStr]?.tasks || [];
          const seenKeys = new Set<string>();

          dailyTasks.forEach(task => {
              const key = task.task_id ? task.task_id : `${task.title}-${task.priority}`;
              seenKeys.add(key);

              if (activeTaskMap.has(key)) {
                  const blockIndex = activeTaskMap.get(key)!;
                  const block = merged[blockIndex];
                  // Continuity check: 
                  // If we are skipping weekends, the columns are naturally adjacent in the array.
                  // So if block.startColIndex + block.duration === colIndex, it means this task continues to the *next displayed column*.
                  // This naturally handles the "spanning over hidden weekend" visual merge.
                  if (block.startColIndex + block.duration === colIndex) {
                      block.duration += 1;
                      return;
                  } else {
                      activeTaskMap.delete(key);
                  }
              }
              const newBlock: MergedTaskBlock = {
                  task: task, startColIndex: colIndex, duration: 1, rowIndex: -1
              };
              merged.push(newBlock);
              activeTaskMap.set(key, merged.length - 1);
          });
          for (const [key] of activeTaskMap) { if (!seenKeys.has(key)) activeTaskMap.delete(key); }
      });

      merged.sort((a, b) => {
          if (a.startColIndex !== b.startColIndex) return a.startColIndex - b.startColIndex;
          return b.duration - a.duration;
      });

      const lanes: boolean[][] = [];
      merged.forEach(block => {
          let laneIdx = 0;
          let placed = false;
          while (!placed) {
              if (!lanes[laneIdx]) lanes[laneIdx] = [];
              let isFree = true;
              for (let i = block.startColIndex; i < block.startColIndex + block.duration; i++) {
                  if (lanes[laneIdx][i]) { isFree = false; break; }
              }
              if (isFree) {
                  block.rowIndex = laneIdx;
                  for (let i = block.startColIndex; i < block.startColIndex + block.duration; i++) lanes[laneIdx][i] = true;
                  placed = true;
              } else laneIdx++;
          }
      });
      return merged;
  };

  const activeFilterCount = statusFilters.length + priorityFilters.length;
  const period = planData?.work_plan?.period;
  const colPercent = 100 / dateColumns.length;

  return (
    <div className="flex h-screen overflow-hidden relative text-slate-800 dark:text-slate-100 transition-colors duration-500">
      
      {/* 1. Background */}
      <div 
        className="fixed inset-0 z-[-2] bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{
            backgroundImage: `url(${darkMode ? BG_DARK : BG_LIGHT})`
        }}
      />
      
      {/* 2. Optimized Overlay for Dark Mode Contrast */}
      <div className={`
        fixed inset-0 z-[-1] backdrop-blur-[24px] transition-all duration-500
        ${darkMode ? 'bg-[#0f172a]/95' : 'bg-white/40'}
      `} />

      {/* Welcome Popup */}
      {showWelcome && (
          <DailyTaskPopup 
              tasks={welcomeTasks} 
              onClose={() => setShowWelcome(false)}
              darkMode={darkMode}
          />
      )}

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.task && (
          <div 
            className={`fixed z-[100] w-64 rounded-2xl shadow-2xl border p-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${darkMode ? 'bg-slate-900/90 border-white/10 text-slate-200' : 'bg-white/90 border-white/50 text-slate-800'}`}
            style={{ top: Math.min(contextMenu.y, window.innerHeight - 300), left: Math.min(contextMenu.x, window.innerWidth - 260) }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
              <div className="p-3 border-b border-dashed border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${contextMenu.task.priority.includes('P0') ? 'bg-rose-500 text-white' : contextMenu.task.priority.includes('P1') ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                          {contextMenu.task.priority}
                      </span>
                      <span className="text-xs font-mono opacity-50">{contextMenu.task.task_id}</span>
                  </div>
                  <div className="text-sm font-bold leading-snug">{contextMenu.task.title}</div>
              </div>
              <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                      <span className="opacity-50">Status</span>
                      <span className="font-semibold">{contextMenu.task.status}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="opacity-50">Type</span>
                      <span className="font-semibold">{contextMenu.task.type}</span>
                  </div>
                  {contextMenu.task.work_hour && (
                      <div className="flex justify-between items-center">
                          <span className="opacity-50">Hours</span>
                          <span className="font-semibold">{contextMenu.task.work_hour}h</span>
                      </div>
                  )}
              </div>
              <div className="p-1 grid grid-cols-2 gap-1">
                  <button onClick={handleCopyLink} className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button onClick={handleOpenLink} className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors text-blue-500 ${darkMode ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50'}`}>
                      <ExternalLink size={14} />
                      Open PMO
                  </button>
              </div>
          </div>
      )}

      {/* Sidebar - Drawer on Mobile */}
      {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
      )}
      <div 
        className={`
            fixed lg:relative inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 transform
            ${sidebarOpen ? 'translate-x-0 w-72 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden'}
            ${darkMode ? 'bg-slate-900/95 border-white/5' : 'bg-white/80 border-white/20'}
            border-r backdrop-blur-xl
        `}
      >
        <div className={`h-16 border-b flex items-center px-5 font-bold flex-shrink-0 ${darkMode ? 'border-white/5 text-slate-100' : 'border-white/30 text-slate-800'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                <Layout className="text-white" size={18} />
            </div>
            <span className="truncate text-lg tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">Q-Plan</span>
            <button 
                onClick={() => setSidebarOpen(false)}
                className="ml-auto lg:hidden p-1 text-slate-400 hover:text-slate-600"
            >
                <X size={20} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {relation ? (
                <OrgTree 
                    data={relation} 
                    selectedPath={selectedPath} 
                    onSelect={(path) => {
                        setSelectedPath(path);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                    }} 
                />
            ) : (
                <div className="p-4 text-center text-slate-400 text-sm">Loading Org...</div>
            )}
        </div>
        
        {myRtxId && (
            <div className={`p-4 mx-3 mb-3 rounded-xl border flex items-center gap-3 backdrop-blur-md transition-all hover:shadow-md ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white/40 border-white/30 hover:bg-white/60'}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center text-blue-600 dark:text-blue-300 text-sm font-bold border border-white/20 shadow-sm">
                    {myRtxId.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] opacity-60 font-bold uppercase tracking-widest">User</div>
                    <div className="text-sm font-semibold truncate">{myRtxId}</div>
                </div>
                <button onClick={clearMe} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                    <MoreHorizontal size={16} className="opacity-50" />
                </button>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative h-full">
        
        {/* Responsive Header Bar */}
        <div className={`
            flex flex-wrap items-center justify-between px-4 py-3 z-30 gap-y-3 relative transition-colors duration-300
            ${darkMode ? 'bg-slate-900/50 border-white/5' : 'bg-white/60 border-white/20'}
            border-b backdrop-blur-md shadow-sm
        `}>
            
            {/* Top Row: Navigation & Title */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
                <button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className={`p-2 rounded-xl transition-all flex-shrink-0 ${darkMode ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-white/60 text-slate-600 shadow-sm border border-transparent hover:border-white/40'}`}
                >
                    {sidebarOpen ? <ChevronLeft size={20} className="hidden lg:block"/> : <ChevronRight size={20} className="hidden lg:block" />}
                     <div className="lg:hidden"><Layout size={20}/></div>
                </button>

                <div className="flex flex-col truncate flex-1 lg:flex-none">
                    <h1 className={`text-lg lg:text-xl font-bold truncate tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                         {selectedPath}
                    </h1>
                     <div className="text-xs opacity-60 flex items-center gap-1.5 font-medium">
                        <CalendarDays size={12} />
                        <span className="tracking-wide">{period ? `${period.start_date} — ${period.end_date}` : '...'}</span>
                    </div>
                </div>
                
                <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`p-2 rounded-full transition-all hover:rotate-180 duration-500 flex-shrink-0 ${refreshing ? 'animate-spin text-blue-500' : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}
                 >
                     <RefreshCw size={18} />
                 </button>
            </div>

            {/* Middle Row/Section: Date Controls */}
            <div className="w-full lg:w-auto flex items-center justify-center gap-2 order-3 lg:order-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                <div className={`flex items-center p-1 rounded-xl border shadow-sm backdrop-blur-md w-full sm:w-auto justify-between sm:justify-start ${darkMode ? 'bg-black/30 border-white/10' : 'bg-white/40 border-white/40'}`}>
                    <button 
                        onClick={handleBackToToday}
                        className={`px-3 lg:px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${darkMode ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-white/80 text-slate-700 shadow-sm'}`}
                    >
                        Today
                    </button>
                    <div className="w-[1px] h-4 bg-slate-400/20 mx-1 lg:mx-2"></div>
                    <button onClick={() => shiftDate('prev')} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}>
                        <ChevronLeft size={16} />
                    </button>
                    <div className="relative flex-1 sm:flex-none flex justify-center">
                        <button 
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="flex items-center gap-2 px-2 lg:px-4 py-1 text-sm font-semibold"
                        >
                            <span>{centerDate}</span>
                        </button>
                        {isCalendarOpen && (
                             <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-5 w-72 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200
                                ${darkMode ? 'bg-slate-800/95 border-slate-700/50 text-slate-200' : 'bg-white/95 border-white/60 text-slate-800'}
                                backdrop-blur-2xl
                             `}>
                                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
                                    <span className="text-xs font-bold uppercase opacity-60">View Settings</span>
                                    <X size={14} className="cursor-pointer opacity-50 hover:opacity-100" onClick={() => setIsCalendarOpen(false)} />
                                </div>
                                <div className="p-5 space-y-5">
                                    <div>
                                        <label className="text-xs font-bold opacity-60 mb-2 block uppercase tracking-wider">Jump To Date</label>
                                        <input 
                                            type="date" 
                                            className={`w-full px-3 py-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500/30 outline-none
                                                ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-white/50 border-slate-200'}
                                            `}
                                            value={centerDate}
                                            min={period?.start_date}
                                            max={period?.end_date}
                                            onChange={(e) => e.target.value && setCenterDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold opacity-60 mb-2 block uppercase tracking-wider">Date Range</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {RANGE_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setRangeOffset(opt.value)}
                                                    className={`px-1 py-2 text-xs font-medium rounded-lg border transition-all text-center
                                                        ${rangeOffset === opt.value 
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                                            : darkMode ? 'bg-transparent border-slate-700 hover:bg-slate-700' : 'bg-white/60 border-slate-200 hover:bg-white'}
                                                    `}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`flex items-center justify-between pt-3 border-t ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
                                         <span className="text-sm font-medium">Show Weekends</span>
                                         <button 
                                            onClick={() => setShowWeekends(!showWeekends)}
                                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${showWeekends ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                         >
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${showWeekends ? 'translate-x-5' : 'translate-x-0'}`} />
                                         </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => shiftDate('next')} className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Bottom/Right Row: Filters & Tools */}
            <div className={`w-full lg:w-auto flex items-center gap-2 lg:gap-3 lg:ml-auto lg:border-none order-2 lg:order-3 ${darkMode ? 'border-white/10' : 'border-black/5'}`}>
                
                {/* Theme Toggle */}
                <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${darkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-white/40 text-slate-500 hover:bg-white/80 shadow-sm'}`}
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search..."
                        className={`pl-9 pr-4 py-2 rounded-xl text-sm w-full transition-all border outline-none focus:ring-2 focus:ring-blue-500/30 backdrop-blur-sm
                            ${darkMode ? 'bg-black/30 border-white/10 focus:bg-black/50 text-white placeholder-white/30' : 'bg-white/40 border-white/20 focus:bg-white/80 focus:border-white/50 text-slate-800 placeholder-slate-500'}
                        `}
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
                
                {myRtxId && (
                    <button 
                        onClick={handleToggleMe}
                        className={`flex items-center justify-center w-10 lg:w-auto lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm
                        ${onlyMe ? 'bg-blue-600 text-white shadow-blue-500/30' : darkMode ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-white/40 text-slate-600 hover:bg-white/80'}`}
                    >
                        <User size={16} />
                        <span className="hidden lg:inline ml-2">Me</span>
                    </button>
                )}
                
                <div className="relative">
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm
                        ${(isFilterOpen || activeFilterCount > 0) ? 'bg-blue-600 text-white shadow-blue-500/30' : darkMode ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-white/40 text-slate-600 hover:bg-white/80'}`}
                    >
                        <Filter size={16} />
                        <span className="hidden lg:inline">Filter</span>
                        {activeFilterCount > 0 && <span className="bg-white text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-extrabold lg:absolute lg:-top-1 lg:-right-1 lg:static">{activeFilterCount}</span>}
                    </button>
                    {isFilterOpen && (
                         <div className={`absolute top-full right-0 mt-4 w-72 lg:w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl
                            ${darkMode ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-white/50'}
                         `}>
                            <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-white/10' : 'border-slate-100'}`}>
                                <span className="text-xs font-bold uppercase opacity-60 tracking-wider">Filter Tasks</span>
                                <button onClick={clearFilters} className="text-xs font-semibold text-blue-500 hover:underline">Reset All</button>
                            </div>
                            <div className="p-5 flex flex-col sm:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="text-xs font-bold opacity-60 mb-3 uppercase tracking-wider">Priority</div>
                                    {PRIORITIES.map(p => (
                                        <div key={p} onClick={() => toggleFilter(priorityFilters, p, setPriorityFilters)} className={`flex items-center gap-3 mb-1.5 cursor-pointer p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                                            <div className={`w-4 h-4 rounded shadow-sm border flex items-center justify-center transition-all ${priorityFilters.includes(p) ? 'bg-blue-500 border-blue-500' : 'border-slate-400 bg-transparent'}`}>
                                                {priorityFilters.includes(p) && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                                            </div>
                                            <span className="text-sm font-medium">{p}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className={`w-[1px] hidden sm:block ${darkMode ? 'bg-white/10' : 'bg-slate-200'}`} />
                                <div className="flex-1">
                                    <div className="text-xs font-bold opacity-60 mb-3 uppercase tracking-wider">Status</div>
                                    {STATUSES.map(s => (
                                        <div key={s} onClick={() => toggleFilter(statusFilters, s, setStatusFilters)} className={`flex items-center gap-3 mb-1.5 cursor-pointer p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                                            <div className={`w-4 h-4 rounded shadow-sm border flex items-center justify-center transition-all ${statusFilters.includes(s) ? 'bg-blue-500 border-blue-500' : 'border-slate-400 bg-transparent'}`}>
                                                {statusFilters.includes(s) && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                                            </div>
                                            <span className="text-sm font-medium truncate">{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         </div>
                    )}
                </div>
            </div>
        </div>

        {/* Statistics - Stack on Mobile */}
        {planData && (
            <div className={`relative z-20 transition-colors duration-300 ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-white/20 border-white/20'} border-b backdrop-blur-md`}>
                 <StatsPanel employees={filteredEmployees} darkMode={darkMode} />
            </div>
        )}

        {/* Schedule Grid Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
            
            {loading && !planData && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-50">
                    <Loader2 className="animate-spin text-blue-500 drop-shadow-lg" size={48} />
                </div>
            )}

            {planData && (
                <div className="flex-1 overflow-auto custom-scrollbar relative overscroll-contain">
                    <table className="w-full min-w-[800px] border-collapse table-fixed">
                        <thead className={`sticky top-0 z-40 shadow-md ${darkMode ? 'bg-[#0f172a] shadow-black/40' : 'bg-white/90 shadow-slate-200/50'} backdrop-blur-xl`}>
                            <tr>
                                <th className={`sticky left-0 z-50 w-48 sm:w-56 border-b border-r p-4 text-left font-bold text-xs uppercase tracking-wider
                                    ${darkMode ? 'bg-[#0f172a] border-white/10 text-slate-400' : 'bg-white border-slate-200/80 text-slate-500'}
                                    shadow-[4px_0_15px_-4px_rgba(0,0,0,0.05)]
                                `}>
                                    Employee
                                </th>
                                {dateColumns.map(date => (
                                    <th 
                                        key={date.dateStr} 
                                        className={`border-b border-r p-3 text-center transition-colors
                                            ${darkMode 
                                                ? (date.isWeekend ? 'bg-black/20 border-white/5' : 'border-white/5')
                                                : (date.isWeekend ? 'bg-slate-50/50 border-slate-200/60' : 'border-slate-200/60')}
                                            ${isToday(date.dateStr) ? (darkMode ? '!bg-blue-500/10' : '!bg-blue-50/50') : ''}
                                        `}
                                    >
                                        <div className={`text-sm font-bold ${isToday(date.dateStr) ? 'text-blue-500' : 'opacity-80'}`}>
                                            {date.dayName}
                                        </div>
                                        <div className={`text-[10px] font-semibold mt-0.5 ${isToday(date.dateStr) ? 'text-blue-400' : 'opacity-40'}`}>
                                            {date.displayDate}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length === 0 ? (
                                <tr><td colSpan={dateColumns.length + 1} className="p-10 text-center opacity-50">No tasks found.</td></tr>
                            ) : (
                                filteredEmployees.map((emp) => {
                                    const mergedTasks = getMergedTasks(emp, dateColumns);
                                    const maxRowIndex = mergedTasks.length > 0 ? Math.max(...mergedTasks.map(t => t.rowIndex)) : -1;
                                    const containerHeight = Math.max(72, (maxRowIndex + 1) * ROW_HEIGHT + 10);
                                    const isSelf = emp.rtx_id === myRtxId;

                                    return (
                                        <tr key={emp.rtx_id} className={`group ${isSelf ? (darkMode ? 'bg-blue-900/10' : 'bg-blue-50/30') : 'hover:bg-white/20 dark:hover:bg-white/5'}`}>
                                            <td className={`sticky left-0 z-30 p-4 border-b border-r transition-colors
                                                ${darkMode ? 'bg-[#0f172a] border-white/5 text-slate-300' : 'bg-white/90 border-slate-200/60 text-slate-700'}
                                                ${isSelf ? (darkMode ? '!bg-slate-800' : '!bg-blue-50/80') : ''}
                                                backdrop-blur-md shadow-[4px_0_15px_-4px_rgba(0,0,0,0.05)]
                                            `}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm tracking-tight">{emp.name}</span>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {!isSelf ? (
                                                            <button onClick={() => handleSetMe(emp.rtx_id)} className="text-[10px] opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-blue-500 font-semibold underline transition-opacity">
                                                                Is this you?
                                                            </button>
                                                        ) : (
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-extrabold shadow-sm tracking-wide">YOU</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <td colSpan={dateColumns.length} className={`border-b p-0 relative h-full align-top ${darkMode ? 'border-white/5' : 'border-slate-200/60'}`}>
                                                <div className="relative w-full" style={{ height: `${containerHeight}px` }}>
                                                    {/* Grid Lines */}
                                                    <div className="absolute inset-0 flex pointer-events-none">
                                                        {dateColumns.map(date => (
                                                            <div key={`bg-${date.dateStr}`} className={`flex-1 border-r h-full ${darkMode ? 'border-white/5' : 'border-slate-200/60'} ${date.isWeekend ? (darkMode ? 'bg-black/20' : 'bg-slate-50/30') : ''} ${isToday(date.dateStr) ? (darkMode ? '!bg-blue-500/5' : '!bg-blue-50/20') : ''}`} />
                                                        ))}
                                                    </div>
                                                    {/* Tasks */}
                                                    <div className="absolute inset-0 top-2">
                                                        {mergedTasks.map((block, i) => {
                                                            // Determine if the card is too small to show full details.
                                                            // Threshold: if width is less than ~10% of the viewport container (column percentage * duration)
                                                            const widthPercent = block.duration * colPercent;
                                                            const isSmall = widthPercent < 10;

                                                            return (
                                                                <TaskCard 
                                                                    key={`${block.task.task_id}-${i}`} 
                                                                    task={block.task}
                                                                    isSmall={isSmall}
                                                                    onContextMenu={(e) => handleContextMenu(e, block.task)}
                                                                    style={{
                                                                        left: `calc(${block.startColIndex * colPercent}% + 4px)`,
                                                                        width: `calc(${block.duration * colPercent}% - 8px)`,
                                                                        top: `${block.rowIndex * ROW_HEIGHT}px`
                                                                    }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;
