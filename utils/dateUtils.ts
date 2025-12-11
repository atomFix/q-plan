
import { DateColumn } from '../types';

/**
 * Returns today's date as YYYY-MM-DD string using local time.
 */
export const getTodayStr = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Generates dates centered around a specific date.
 * @param centerDateStr YYYY-MM-DD
 * @param offset Number of days before and after (e.g., 3 means +/- 3 days)
 * @param skipWeekends If true, weekends are excluded from the count (workdays only)
 */
export const generateCenteredDateColumns = (centerDateStr: string, offset: number, skipWeekends: boolean = false): DateColumn[] => {
    const center = new Date(centerDateStr);
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    const createCol = (d: Date): DateColumn => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        return {
            dateStr: dateStr,
            dayName: weekMap[d.getDay()],
            isWeekend: d.getDay() === 0 || d.getDay() === 6,
            displayDate: `${month}/${day}`
        };
    };

    const columns: DateColumn[] = [];
    
    // 1. Calculate Before (loop backwards until we have 'offset' valid days)
    let current = new Date(center);
    let added = 0;
    while(added < offset) {
        current.setDate(current.getDate() - 1);
        const isW = current.getDay() === 0 || current.getDay() === 6;
        if (skipWeekends && isW) continue;
        columns.unshift(createCol(current));
        added++;
    }

    // 2. Center
    const centerIsWeekend = center.getDay() === 0 || center.getDay() === 6;
    // If skipping weekends and center is weekend, we generally exclude it to maintain "Workday View" purity,
    // but this might leave a gap or 'missing' center.
    // However, usually users select a workday as center or land on Today (which might be weekend).
    // If Today is Sat, and we view Workdays, showing empty middle is weird. 
    // But strict filtering suggests skipping it.
    if (!skipWeekends || !centerIsWeekend) {
        columns.push(createCol(center));
    }

    // 3. Calculate After
    current = new Date(center);
    added = 0;
    while(added < offset) {
        current.setDate(current.getDate() + 1);
        const isW = current.getDay() === 0 || current.getDay() === 6;
        if (skipWeekends && isW) continue;
        columns.push(createCol(current));
        added++;
    }

    return columns;
};

export const isToday = (dateStr: string) => {
  return getTodayStr() === dateStr;
};
