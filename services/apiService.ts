import { PlanResponse, RelationResponse, WorkPlan, EmployeePlan, DailyPlan, Task } from '../types';
import { REAL_RELATION_DATA, REAL_PLAN_DATA } from './mockData';

// Cache Configuration
const CACHE_PREFIX = 'qodin_plan_cache_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheItem {
    timestamp: number;
    data: PlanResponse;
}

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchRelation = async (path: string): Promise<RelationResponse> => {
    // Org structure changes rarely, we can cache it longer or use same logic.
    // For simplicity, sticking to memory cache or simple pass-through as per previous logic, 
    // or adding simple local storage here too.
    const cacheKey = `qodin_rel_cache_${path}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            return JSON.parse(cached) as RelationResponse;
        } catch(e) { console.error(e); }
    }

    await delay(300); 
    const data = REAL_RELATION_DATA.data;
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data as RelationResponse;
};

export const fetchPlan = async (path: string, forceRefresh: boolean = false): Promise<PlanResponse> => {
    const cacheKey = `${CACHE_PREFIX}${path}`;
    const now = new Date();
    const nowTime = now.getTime();
    const isThursday = now.getDay() === 4; // 0=Sun, 4=Thu

    // 1. Try to load from Cache first
    if (!forceRefresh) {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
            try {
                const cached: CacheItem = JSON.parse(cachedStr);
                const cacheTime = new Date(cached.timestamp);
                
                // Check 1: 7-day expiration
                const isExpiredByDuration = (nowTime - cached.timestamp) > CACHE_DURATION;
                
                // Check 2: Thursday Rule
                // If today is Thursday, and the cache was NOT created today, we consider it stale.
                // We compare date strings to check if it's the same day.
                let isExpiredByThursdayRule = false;
                if (isThursday) {
                    const cacheDateStr = cacheTime.toDateString(); // "Thu Dec 10 2025"
                    const todayDateStr = now.toDateString();
                    if (cacheDateStr !== todayDateStr) {
                        isExpiredByThursdayRule = true;
                        console.log(`[Cache] Thursday detected. Cache from ${cacheDateStr} is stale.`);
                    }
                }

                if (!isExpiredByDuration && !isExpiredByThursdayRule) {
                    console.log(`[Cache] Hit for ${path}`);
                    return cached.data;
                }
            } catch (e) {
                console.warn("[Cache] Parse error, refetching...", e);
            }
        }
    }

    console.log(`[API] Fetching plan for ${path}...`);
    await delay(400);
  
    const rawData = REAL_PLAN_DATA.data;

    // Transform raw data to internal structure
    const employees: EmployeePlan[] = rawData.employees.map((emp: any) => {
        const daily_plans: Record<string, DailyPlan> = {};
        
        emp.plans.forEach((p: any) => {
            const tasks: Task[] = p.tasks.map((t: any) => ({
                priority: t.priority,
                task_id: t.name,
                title: t.title,
                type: t.issuetype,
                work_hour: t.workhour,
                status: t.job
            }));

            daily_plans[p.date] = {
                task_count: p.count,
                tasks: tasks
            };
        });

        return {
            rtx_id: emp.rtx_id,
            name: emp.name,
            department: emp.department,
            daily_plans: daily_plans
        };
    });

    const work_plan: WorkPlan = {
        period: {
            start_date: rawData.start_date,
            end_date: rawData.end_date
        },
        employees: employees
    };

    const response: PlanResponse = {
        org_tree: {},
        work_plan: work_plan
    };
  
    // Save to Cache
    try {
        const cacheItem: CacheItem = {
            timestamp: nowTime,
            data: response
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (e) {
        console.error("Failed to save cache", e);
    }

    return response;
};