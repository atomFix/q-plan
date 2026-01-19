import { PlanResponse, RelationResponse, WorkPlan, EmployeePlan, DailyPlan, Task } from '../types';

// Cache Configuration
const CACHE_PREFIX = 'qodin_plan_cache_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const RELATION_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for org structure

interface CacheItem {
    timestamp: number;
    data: PlanResponse;
}

interface RelationCacheItem {
    timestamp: number;
    data: RelationResponse;
}

export const fetchRelation = async (path: string, forceRefresh: boolean = false, abortSignal?: AbortSignal): Promise<RelationResponse> => {
    const cacheKey = `qodin_rel_cache_${path}`;
    const now = new Date();
    const nowTime = now.getTime();

    // Try to load from Cache first
    if (!forceRefresh) {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
            try {
                const cached: RelationCacheItem = JSON.parse(cachedStr);
                const cacheAge = nowTime - cached.timestamp;

                // 30 days cache for org structure
                if (cacheAge < RELATION_CACHE_DURATION) {
                    console.log(`[Cache] Relation hit for ${path}, age: ${Math.round(cacheAge / (24 * 60 * 60 * 1000))} days`);
                    return cached.data;
                } else {
                    console.log(`[Cache] Relation expired for ${path}`);
                }
            } catch (e) {
                console.warn("[Cache] Relation parse error, refetching...", e);
            }
        }
    }

    console.log(`[API] Fetching relation for ${path}...`);

    try {
        const apiUrl = `/qodin/api/relation/getRelation?path=${encodeURIComponent(path)}`;
        const fetchResponse = await fetch(apiUrl, { signal: abortSignal });

        if (!fetchResponse.ok) {
            throw new Error(`Relation API request failed: ${fetchResponse.status}`);
        }

        const apiResponse = await fetchResponse.json();

        if (apiResponse.status !== 0) {
            throw new Error(`Relation API error: ${apiResponse.message}`);
        }

        const data = apiResponse.data as RelationResponse;

        // Save to Cache
        try {
            const cacheItem: RelationCacheItem = {
                timestamp: nowTime,
                data: data
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            console.log(`[Cache] Relation saved for ${path}`);
        } catch (e) {
            console.error("Failed to save relation cache", e);
        }

        return data;
    } catch (error: any) {
        // If request was aborted, don't log as error
        if (error.name === 'AbortError') {
            console.log(`[API] Relation request aborted for ${path}`);
            throw error;
        }
        console.error(`[API] Failed to fetch relation for ${path}:`, error);
        throw error;
    }
};

export const fetchPlan = async (path: string, forceRefresh: boolean = false, abortSignal?: AbortSignal): Promise<PlanResponse> => {
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

    try {
        // Build API URL with path parameter (using proxy)
        const apiUrl = `/qodin/api/issue/getPlan?param=${encodeURIComponent(path)}&typew=&parent=1,2`;
        const fetchResponse = await fetch(apiUrl, { signal: abortSignal });

        if (!fetchResponse.ok) {
            throw new Error(`API request failed: ${fetchResponse.status}`);
        }

        const apiResponse = await fetchResponse.json();

        if (apiResponse.status !== 0) {
            throw new Error(`API error: ${apiResponse.message}`);
        }

        const rawData = apiResponse.data;

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

        const planResponse: PlanResponse = {
            org_tree: {},
            work_plan: work_plan
        };

        // Save to Cache
        try {
            const cacheItem: CacheItem = {
                timestamp: nowTime,
                data: planResponse
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        } catch (e) {
            console.error("Failed to save cache", e);
        }

        return planResponse;
    } catch (error: any) {
        // If request was aborted, don't log as error
        if (error.name === 'AbortError') {
            console.log(`[API] Plan request aborted for ${path}`);
            throw error;
        }
        console.error(`[API] Failed to fetch plan for ${path}:`, error);
        throw error;
    }
};