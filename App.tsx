
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    MoreHorizontal,
    Copy,
    ExternalLink,
    Check,
    Briefcase,
    AlertCircle,
    CheckCircle2,
    Code,
    Sun,
    Moon
} from 'lucide-react';

import { OrgTree } from './components/OrgTree';
import { TaskCard } from './components/TaskCard';
import { StatsPanel } from './components/StatsPanel';
import { DailyTaskPopup } from './components/DailyTaskPopup';
import { generateCenteredDateColumns, isToday, getTodayStr } from './utils/dateUtils';
import { fetchPlan, fetchRelation, fetchPlanByParent } from './services/apiService';
import { DateColumn, PlanResponse, RelationResponse, EmployeePlan, DailyPlan, Task } from './types';

// Key for LocalStorage
const STORAGE_USER_KEY = 'qodin_my_rtx';
const STORAGE_USER_PATH_KEY = 'qodin_my_path';
const STORAGE_LAST_PATH = 'qodin_last_path';
const STORAGE_FILTER_PRIORITY = 'qodin_filter_priority';
const STORAGE_FILTER_STATUS = 'qodin_filter_status';
const STORAGE_FILTER_PARENT = 'qodin_filter_parent';

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const STATUSES = ['coding', 'support', 'planning', 'review', 'done', '进行中', '未开始'];
const PARENT_FILTERS = ['1', '2']; // 1=父项目, 2=子项目 

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
  const [refreshingRelation, setRefreshingRelation] = useState(false);
  const [switchingTeam, setSwitchingTeam] = useState(false);
  const [relation, setRelation] = useState<RelationResponse | null>(null);
  const [planData, setPlanData] = useState<PlanResponse | null>(null);

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('qodin_theme_dark');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('qodin_theme_dark', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // View State
  const [selectedPath, setSelectedPath] = useState<string>('');
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

  const [statusFilters, setStatusFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_FILTER_STATUS);
    return saved ? JSON.parse(saved) : [];
  });
  const [priorityFilters, setPriorityFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_FILTER_PRIORITY);
    return saved ? JSON.parse(saved) : [];
  });
  const [parentFilters, setParentFilters] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_FILTER_PARENT);
    return saved ? JSON.parse(saved) : [];
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Refs for portal positioning
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Refs for abort controllers to cancel pending requests
  const planAbortControllerRef = useRef<AbortController | null>(null);
  const relationAbortControllerRef = useRef<AbortController | null>(null);

  // State for portal positioning
  const [calendarPosition, setCalendarPosition] = useState<{top: number; left: number} | null>(null);
  const [filterPosition, setFilterPosition] = useState<{top: number; left: number} | null>(null);

  // Update popup positions when opened
  useEffect(() => {
    if (isCalendarOpen && calendarButtonRef.current) {
      const rect = calendarButtonRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2
      });
    } else {
      setCalendarPosition(null);
    }
  }, [isCalendarOpen]);

  useEffect(() => {
    if (isFilterOpen && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterPosition({
        top: rect.bottom + 8,
        left: rect.right
      });
    } else {
      setFilterPosition(null);
    }
  }, [isFilterOpen]);

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

  // Helper: Get display name from full path (last segment)
  const getDisplayName = (path: string) => {
      const parts = path.split(',');
      return parts[parts.length - 1];
  };

  // --- Effects ---

  // Initial Load
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_USER_KEY);
    const savedPath = localStorage.getItem(STORAGE_LAST_PATH);
    if (savedUser) setMyRtxId(savedUser);

    // Always restore the last selected team on page load
    if (savedPath) {
        setSelectedPath(savedPath);
    }

    const init = async () => {
      // Create abort controller for initial request
      const abortController = new AbortController();
      relationAbortControllerRef.current = abortController;

      try {
        const relData = await fetchRelation('技术中心', false, abortController.signal);
        // Only update state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setRelation(relData);
        }
      } catch (e: any) {
        // Ignore abort errors
        if (e.name !== 'AbortError') {
          console.error("Failed to load org tree", e);
        }
      }
    };
    init();
  }, []);

  // 2. Fetch Plan
  useEffect(() => {
    if (!selectedPath) return;
    localStorage.setItem(STORAGE_LAST_PATH, selectedPath);

    // Don't load plan data for top-level root nodes (they're too large)
    // Only load for specific teams/leaf nodes
    const isRootLevel = selectedPath === '技术中心' || selectedPath.split(',').length <= 1;
    if (isRootLevel) {
        setPlanData(null);
        setLoading(false);
        setSwitchingTeam(false);
        return;
    }

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

  // 5. Cleanup on unmount - cancel any pending requests
  useEffect(() => {
    return () => {
      if (planAbortControllerRef.current) {
        planAbortControllerRef.current.abort();
      }
      if (relationAbortControllerRef.current) {
        relationAbortControllerRef.current.abort();
      }
    };
  }, []);

  // 6. Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_FILTER_PRIORITY, JSON.stringify(priorityFilters));
  }, [priorityFilters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_FILTER_STATUS, JSON.stringify(statusFilters));
  }, [statusFilters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_FILTER_PARENT, JSON.stringify(parentFilters));
  }, [parentFilters]);

  const loadPlanData = async (forceRefresh: boolean = false) => {
    // Cancel any pending request
    if (planAbortControllerRef.current) {
      planAbortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    planAbortControllerRef.current = abortController;

    if (!planData) {
        setLoading(true);
    }
    try {
      // Fetch only two data sets in parallel: parent and child projects
      const [parentData, childData] = await Promise.all([
        fetchPlanByParent(selectedPath, '1', forceRefresh, abortController.signal),
        fetchPlanByParent(selectedPath, '2', forceRefresh, abortController.signal)
      ]);

      // Only update state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        // Merge parent and child data by combining employees
        const mergedEmployeesMap = new Map<string, EmployeePlan>();

        // Helper function to add or merge employee data
        const mergeEmployee = (emp: EmployeePlan, parentType: '1' | '2') => {
          const existing = mergedEmployeesMap.get(emp.rtx_id);
          if (existing) {
            // Merge daily plans
            Object.entries(emp.daily_plans).forEach(([date, plan]) => {
              if (!existing.daily_plans[date]) {
                existing.daily_plans[date] = { task_count: 0, tasks: [] };
              }
              existing.daily_plans[date].task_count += plan.task_count;
              // Add parent tag to tasks
              const taggedTasks = plan.tasks.map(task => ({
                ...task,
                parent: parentType
              }));
              existing.daily_plans[date].tasks.push(...taggedTasks);
            });
          } else {
            // Create new employee entry with parent-tagged tasks
            const taggedPlans: Record<string, DailyPlan> = {};
            Object.entries(emp.daily_plans).forEach(([date, plan]) => {
              taggedPlans[date] = {
                task_count: plan.task_count,
                tasks: plan.tasks.map(task => ({
                  ...task,
                  parent: parentType
                }))
              };
            });
            mergedEmployeesMap.set(emp.rtx_id, {
              rtx_id: emp.rtx_id,
              name: emp.name,
              department: emp.department,
              daily_plans: taggedPlans
            });
          }
        };

        // Merge parent data
        parentData.forEach(emp => mergeEmployee(emp, '1'));
        // Merge child data
        childData.forEach(emp => mergeEmployee(emp, '2'));

        // Construct the merged PlanResponse
        const mergedData: PlanResponse = {
          org_tree: {},
          work_plan: {
            period: {
              start_date: '',
              end_date: ''
            },
            employees: Array.from(mergedEmployeesMap.values())
          }
        };

        setPlanData(mergedData);
      }
    } catch (e: any) {
      // Ignore abort errors - they're expected when switching teams quickly
      if (e.name !== 'AbortError') {
        console.error("Failed to load plan", e);
      }
    }
    // Only clear loading state if this wasn't aborted
    if (!abortController.signal.aborted) {
      setLoading(false);
      setSwitchingTeam(false);
    }
  };

  const handleRefresh = async (event?: React.MouseEvent) => {
      setRefreshing(true);
      // Always force refresh when clicking the refresh button
      await loadPlanData(true);
      setRefreshing(false);
  };

  const handleRefreshRelation = async () => {
      // Cancel any pending request
      if (relationAbortControllerRef.current) {
        relationAbortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      relationAbortControllerRef.current = abortController;

      setRefreshingRelation(true);
      try {
          const relData = await fetchRelation('技术中心', true, abortController.signal);
          // Only update state if this request wasn't aborted
          if (!abortController.signal.aborted) {
            setRelation(relData);
          }
      } catch (e: any) {
          // Ignore abort errors
          if (e.name !== 'AbortError') {
            console.error("Failed to refresh org tree", e);
          }
      }
      // Only clear loading state if this wasn't aborted
      if (!abortController.signal.aborted) {
        setRefreshingRelation(false);
      }
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
      setParentFilters([]);
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
      const hasTaskFilters = statusFilters.length > 0 || priorityFilters.length > 0 || parentFilters.length > 0;
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
                  const matchParent = parentFilters.length === 0 || (t.parent && parentFilters.includes(t.parent));

                  if (!matchPriority || !matchStatus || !matchParent) return false;

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

  }, [planData, filterText, onlyMe, myRtxId, statusFilters, priorityFilters, parentFilters, dateColumns]);

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

  const activeFilterCount = statusFilters.length + priorityFilters.length + parentFilters.length;
  const period = planData?.work_plan?.period;
  const colPercent = 100 / dateColumns.length;

  return (
    <div className="flex h-screen overflow-hidden relative transition-colors duration-300 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">

      {/* Welcome Popup */}
      {showWelcome && (
          <DailyTaskPopup
              tasks={welcomeTasks}
              onClose={() => setShowWelcome(false)}
          />
      )}

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.task && (
          <div
            className="fixed z-[100] w-64 rounded-2xl shadow-2xl border p-1 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
            style={{
                top: Math.min(contextMenu.y, window.innerHeight - 300),
                left: Math.min(contextMenu.x, window.innerWidth - 260)
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
              <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-700/30">
                  <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold shadow-sm ${
                          contextMenu.task.priority.includes('P0')
                            ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white'
                            : contextMenu.task.priority.includes('P1')
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                            : contextMenu.task.priority.includes('P2')
                            ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white'
                            : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
                      }`}>
                          {contextMenu.task.priority}
                      </span>
                      <span className="text-xs font-mono opacity-50">{contextMenu.task.task_id}</span>
                  </div>
                  <div className="text-sm font-display font-bold leading-snug">{contextMenu.task.title}</div>
              </div>
              <div className="p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                      <span className="opacity-50 font-medium">Status</span>
                      <span className="font-semibold">{contextMenu.task.status}</span>
                  </div>
                  <div className="flex justify-between items-center">
                      <span className="opacity-50 font-medium">Type</span>
                      <span className="font-semibold">{contextMenu.task.type}</span>
                  </div>
                  {contextMenu.task.work_hour && (
                      <div className="flex justify-between items-center">
                          <span className="opacity-50 font-medium">Hours</span>
                          <span className="font-semibold">{contextMenu.task.work_hour}h</span>
                      </div>
                  )}
              </div>
              <div className="p-1 grid grid-cols-2 gap-1">
                  <button onClick={handleCopyLink} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-[1.02]">
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Link'}
                  </button>
                  <button onClick={handleOpenLink} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all text-blue-500 hover:bg-blue-500/10 hover:scale-[1.02]">
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
            border-r bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700
        `}
      >
        <div className="h-16 border-b flex items-center px-5 font-bold flex-shrink-0 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mr-3 shadow-lg shadow-violet-500/25">
                <Layout className="text-white" size={18} />
            </div>
            <span className="truncate text-lg font-bold tracking-tight">Q-Plan</span>
            <button
                onClick={handleRefreshRelation}
                disabled={refreshingRelation}
                className={`ml-auto p-2 rounded-xl transition-all mr-1 ${refreshingRelation ? 'animate-spin text-violet-500' : ''} text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700`}
                title="刷新组织架构"
            >
                <RefreshCw size={16} />
            </button>
            <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
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
                        // Immediate feedback - show loading overlay right away
                        if (path !== selectedPath) {
                            setSwitchingTeam(true);
                        }
                        setSelectedPath(path);
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                />
            ) : (
                <div className="p-4 text-center text-slate-400 text-sm">Loading Org...</div>
            )}
        </div>

        {myRtxId && (
            <div className="p-4 mx-3 mb-3 rounded-xl border flex items-center gap-3 transition-all hover:shadow-md bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-700 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer"
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/50 dark:to-violet-800/50 flex items-center justify-center text-violet-700 dark:text-violet-300 text-sm font-bold border border-violet-200 dark:border-violet-700 shadow-sm">
                    {myRtxId.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] opacity-60 font-bold uppercase tracking-widest">User</div>
                    <div className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{myRtxId}</div>
                </div>
                <button onClick={clearMe} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">
                    <MoreHorizontal size={16} className="opacity-50" />
                </button>
            </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative h-full">
        
        {/* Responsive Header Bar */}
        <div className={`
            flex flex-wrap items-center justify-between px-5 py-4 z-[5] gap-y-3 transition-colors duration-300
            border-b shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-slate-200/80 dark:border-slate-700/80
        `}>

            {/* Top Row: Navigation & Title */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-xl transition-all flex-shrink-0 shadow-sm border text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    {sidebarOpen ? <ChevronLeft size={20} className="hidden lg:block"/> : <ChevronRight size={20} className="hidden lg:block" />}
                     <div className="lg:hidden"><Layout size={20}/></div>
                </button>

                <div className="flex flex-col truncate flex-1 lg:flex-none">
                    <h1 className="text-lg lg:text-xl font-display font-bold truncate tracking-tight text-slate-900 dark:text-slate-100">
                         {getDisplayName(selectedPath)}
                    </h1>
                     <div className="text-xs opacity-60 flex items-center gap-1.5 font-medium">
                        <CalendarDays size={12} />
                        <span className="tracking-wide">{period ? `${period.start_date} — ${period.end_date}` : '...'}</span>
                    </div>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`p-2 rounded-full transition-all hover:rotate-180 duration-500 flex-shrink-0 ${refreshing ? 'animate-spin text-violet-500' : ''} text-slate-500 dark:text-slate-400`}
                    title="刷新数据"
                 >
                     <RefreshCw size={18} />
                 </button>
            </div>

            {/* Middle Row/Section: Date Controls */}
            <div className="w-full lg:w-auto flex items-center justify-center gap-2 order-3 lg:order-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                <div className="flex items-center p-1.5 rounded-xl border shadow-sm backdrop-blur-md w-full sm:w-auto justify-between sm:justify-start bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                >
                    <button
                        onClick={handleBackToToday}
                        className="px-3 lg:px-4 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        Today
                    </button>
                    <div className="w-[1px] h-4 bg-slate-400/20 mx-1 lg:mx-2"></div>
                    <button onClick={() => shiftDate('prev')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none">
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex-1 sm:flex-none flex justify-center">
                        <button
                            ref={calendarButtonRef}
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="flex items-center gap-2 px-2 lg:px-4 py-1 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                            <span>{centerDate}</span>
                        </button>
                        {isCalendarOpen && calendarPosition && createPortal(
                             <div className="fixed w-72 rounded-2xl shadow-2xl border z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
                             style={{ top: `${calendarPosition.top}px`, left: `${calendarPosition.left}px`, transform: 'translateX(-50%)' }}
                             >
                                <div className="p-4 border-b flex justify-between items-center border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800/50">
                                    <span className="text-xs font-display font-bold uppercase tracking-widest opacity-60">View Settings</span>
                                    <button
                                        onClick={() => setIsCalendarOpen(false)}
                                        className="p-1 rounded-lg transition-all hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-110"
                                    >
                                        <X size={14} className="opacity-50 hover:opacity-100 transition-opacity" />
                                    </button>
                                </div>
                                <div className="p-5 space-y-5">
                                    <div>
                                        <label className="text-xs font-bold opacity-60 mb-2 block uppercase tracking-widest">Jump To Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500/30 outline-none transition-all bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 focus:bg-white dark:focus:bg-slate-800"
                                            value={centerDate}
                                            min={period?.start_date}
                                            max={period?.end_date}
                                            onChange={(e) => e.target.value && setCenterDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold opacity-60 mb-2 block uppercase tracking-widest">Date Range</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {RANGE_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setRangeOffset(opt.value)}
                                                    className={`px-1 py-2 text-xs font-medium rounded-lg border transition-all text-center shadow-sm ${
                                                        rangeOffset === opt.value
                                                            ? 'bg-gradient-to-r from-violet-500 to-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/25'
                                                            : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                                         <span className="text-sm font-medium">Show Weekends</span>
                                         <button
                                            onClick={() => setShowWeekends(!showWeekends)}
                                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-all ${showWeekends ? 'bg-gradient-to-r from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25' : 'bg-slate-300 dark:bg-slate-600'}`}
                                         >
                                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${showWeekends ? 'translate-x-5' : 'translate-x-0'}`} />
                                         </button>
                                    </div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                    <button onClick={() => shiftDate('next')} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Bottom/Right Row: Filters & Tools */}
            <div className="w-full lg:w-auto flex items-center gap-2 lg:gap-3 lg:ml-auto lg:border-none order-2 lg:order-3"
            >

                {/* Theme Toggle */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                    title="Toggle dark mode"
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-2 rounded-xl text-sm w-full transition-all border outline-none focus:ring-2 focus:ring-violet-500/50 backdrop-blur-sm bg-slate-100/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>

                {myRtxId && (
                    <button
                        onClick={handleToggleMe}
                        className={`flex items-center justify-center w-10 lg:w-auto lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                            onlyMe ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <User size={16} />
                        <span className="hidden lg:inline ml-2">Me</span>
                    </button>
                )}

                <div className="relative">
                    <button
                        ref={filterButtonRef}
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                            (isFilterOpen || activeFilterCount > 0) ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    >
                        <Filter size={16} />
                        <span className="hidden lg:inline">Filter</span>
                        {activeFilterCount > 0 && <span className="bg-white text-violet-600 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-extrabold lg:absolute lg:-top-1 lg:-right-1 lg:static shadow-sm">{activeFilterCount}</span>}
                    </button>
                    {isFilterOpen && filterPosition && createPortal(
                         <div className="fixed w-80 sm:w-96 lg:w-[480px] rounded-2xl shadow-2xl border z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700"
                         style={{
                           top: `${filterPosition.top}px`,
                           right: '16px'
                         }}
                         >
                            <div className="p-4 border-b flex justify-between items-center border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-700/50 dark:to-slate-800/50">
                                <span className="text-xs font-display font-bold uppercase tracking-widest opacity-60">Filter Tasks</span>
                                <button onClick={clearFilters} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline transition-opacity hover:opacity-80">Reset All</button>
                            </div>
                            <div className="p-5 flex flex-col lg:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="text-xs font-bold opacity-60 mb-3 uppercase tracking-widest">Priority</div>
                                    {PRIORITIES.map(p => (
                                        <div key={p} onClick={() => toggleFilter(priorityFilters, p, setPriorityFilters)} className="flex items-center gap-3 mb-1.5 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all card-hover">
                                            <div className={`w-4 h-4 rounded shadow-sm border flex items-center justify-center transition-all ${priorityFilters.includes(p) ? 'bg-gradient-to-br from-violet-500 to-violet-600 border-violet-500 shadow-md shadow-violet-500/20' : 'border-slate-400 bg-transparent'}`}>
                                                {priorityFilters.includes(p) && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                                            </div>
                                            <span className="text-sm font-medium">{p}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-[1px] hidden lg:block bg-slate-200 dark:bg-slate-700" />
                                <div className="flex-1">
                                    <div className="text-xs font-bold opacity-60 mb-3 uppercase tracking-widest">Status</div>
                                    {STATUSES.map(s => (
                                        <div key={s} onClick={() => toggleFilter(statusFilters, s, setStatusFilters)} className="flex items-center gap-3 mb-1.5 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all card-hover">
                                            <div className={`w-4 h-4 rounded shadow-sm border flex items-center justify-center transition-all ${statusFilters.includes(s) ? 'bg-gradient-to-br from-violet-500 to-violet-600 border-violet-500 shadow-md shadow-violet-500/20' : 'border-slate-400 bg-transparent'}`}>
                                                {statusFilters.includes(s) && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                                            </div>
                                            <span className="text-sm font-medium truncate">{s}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="w-[1px] hidden lg:block bg-slate-200 dark:bg-slate-700" />
                                <div className="flex-1">
                                    <div className="text-xs font-bold opacity-60 mb-3 uppercase tracking-widest">Parent Type</div>
                                    {[
                                        { value: '1', label: '父项目 (Parent)' },
                                        { value: '2', label: '子项目 (Child)' }
                                    ].map(({ value, label }) => (
                                        <div key={value} onClick={() => toggleFilter(parentFilters, value, setParentFilters)} className="flex items-center gap-3 mb-1.5 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all card-hover">
                                            <div className={`w-4 h-4 rounded shadow-sm border flex items-center justify-center transition-all ${parentFilters.includes(value) ? 'bg-gradient-to-br from-violet-500 to-violet-600 border-violet-500 shadow-md shadow-violet-500/20' : 'border-slate-400 bg-transparent'}`}>
                                                {parentFilters.includes(value) && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                                            </div>
                                            <span className="text-sm font-medium">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         </div>,
                         document.body
                    )}
                </div>
            </div>
        </div>

        {/* Statistics - Stack on Mobile */}
        {planData && (
            <div className="relative z-30 transition-colors duration-300 border-b bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 fade-in-up"
            >
                 <StatsPanel employees={filteredEmployees} loading={refreshing} />
            </div>
        )}

        {/* Schedule Grid Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">

            {/* Team Switching Transition Overlay */}
            {switchingTeam && planData && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-40 animate-in fade-in duration-300">
                    <div className="text-center">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 blur-xl opacity-20 animate-pulse"></div>
                            <Loader2 className="relative animate-spin text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-violet-600 mx-auto" size={48} />
                        </div>
                        <p className="text-sm font-display font-medium text-slate-600 dark:text-slate-300 tracking-wide">切换团队中...</p>
                    </div>
                </div>
            )}

            {loading && !planData && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent z-50">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 blur-xl opacity-20 animate-pulse"></div>
                        <Loader2 className="relative animate-spin text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-violet-600" size={56} />
                    </div>
                </div>
            )}

            {!loading && !planData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
                    <div className="text-center p-8 rounded-2xl border shadow-lg max-w-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 fade-in-up"
                    >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-inner"
                        >
                            <Layout size={32} className="text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-lg font-display font-bold mb-2 text-slate-900 dark:text-slate-100">
                            {selectedPath && selectedPath.split(',').length <= 1
                                ? `${selectedPath} - 请选择子团队`
                                : '选择团队查看工作计划'}
                        </h3>
                        <p className="text-sm mb-6 text-slate-500 dark:text-slate-400 leading-relaxed">
                            {selectedPath && selectedPath.split(',').length <= 1
                                ? `当前选中的是根节点，请在左侧组织架构中选择具体的子团队查看详细工作计划`
                                : '请从左侧组织架构中选择一个团队以查看该团队的工作计划'
                            }
                        </p>
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="px-6 py-2.5 rounded-xl font-display font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-500/25 bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700"
                        >
                            打开组织架构
                        </button>
                    </div>
                </div>
            )}

            {planData && (
                <div className="flex-1 overflow-auto custom-scrollbar relative overscroll-contain bg-white dark:bg-slate-800">
                    {/* Refresh Overlay */}
                    {refreshing && (
                        <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 animate-in fade-in duration-300 overflow-hidden">
                            <div className="text-center">
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 blur-xl opacity-20 animate-pulse"></div>
                                    <Loader2 className="relative animate-spin text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-violet-600 mx-auto" size={48} />
                                </div>
                                <p className="text-sm font-display font-medium text-slate-600 dark:text-slate-300 tracking-wide">刷新数据中...</p>
                            </div>
                        </div>
                    )}

                    <table className="w-full min-w-[800px] border-collapse table-fixed">
                        <thead className="sticky top-0 z-40 shadow-sm bg-white dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700"
                        >
                            <tr>
                                <th className="sticky left-0 z-50 w-48 sm:w-56 border-b border-r p-4 text-left font-bold text-xs uppercase tracking-wider shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                                >
                                    Employee
                                </th>
                                {dateColumns.map(date => (
                                    <th
                                        key={date.dateStr}
                                        className={`border-b border-r p-3 text-center border-slate-200 dark:border-slate-700 ${
                                            date.isWeekend ? 'bg-slate-50 dark:bg-slate-900/50' : ''
                                        } ${
                                            isToday(date.dateStr) ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                                        }`}
                                    >
                                        <div className={`text-sm font-semibold ${isToday(date.dateStr) ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {date.dayName}
                                        </div>
                                        <div className={`text-[10px] font-medium mt-0.5 ${isToday(date.dateStr) ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}>
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
                                        <tr key={emp.rtx_id} className={`group${isSelf ? ' bg-violet-50 dark:bg-violet-900/20' : ''}`}
                                        >
                                            <td className={`sticky left-0 z-30 p-4 border-b border-r shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300${
                                                isSelf ? ' bg-violet-50 dark:bg-violet-900/20' : ''
                                            }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm tracking-tight">{emp.name}</span>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {!isSelf ? (
                                                            <button onClick={() => handleSetMe(emp.rtx_id)} className="text-[10px] opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-violet-600 font-semibold underline transition-opacity">
                                                                Is this you?
                                                            </button>
                                                        ) : (
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 font-semibold shadow-sm">YOU</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td colSpan={dateColumns.length} className="border-b p-0 relative h-full align-top border-slate-200 dark:border-slate-700"
                                            >
                                                <div className="relative w-full" style={{ height: `${containerHeight}px` }}>
                                                    {/* Grid Lines */}
                                                    <div className="absolute inset-0 flex pointer-events-none">
                                                        {dateColumns.map(date => (
                                                            <div
                                                                key={`bg-${date.dateStr}`}
                                                                className={`flex-1 border-r border-slate-200 dark:border-slate-700${
                                                                    date.isWeekend ? ' bg-slate-50 dark:bg-slate-900/30' : ''
                                                                }${
                                                                    isToday(date.dateStr) ? ' bg-violet-50/50 dark:bg-violet-900/20' : ''
                                                                }`}
                                                            />
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
