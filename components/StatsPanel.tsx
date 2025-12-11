
import React from 'react';
import { EmployeePlan, DailyPlan } from '../types';
import { Briefcase, Clock, Zap, BarChart2 } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsPanelProps {
  employees: EmployeePlan[];
  darkMode?: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ employees, darkMode }) => {
  let totalTasks = 0;
  let totalHours = 0;
  let p1Count = 0;
  
  employees.forEach(emp => {
    Object.values(emp.daily_plans).forEach((day: DailyPlan) => {
        totalTasks += day.task_count;
        day.tasks.forEach(t => {
            if (t.work_hour) totalHours += parseFloat(t.work_hour);
            if (t.priority.includes('P1') || t.priority.includes('P0')) p1Count++;
        });
    });
  });

  const chartData = employees.map(e => {
    let count = 0;
    Object.values(e.daily_plans).forEach((d: DailyPlan) => count += d.task_count);
    return { name: e.name, tasks: count };
  }).sort((a,b) => b.tasks - a.tasks).slice(0, 10);

  const StatItem = ({ label, value, icon: Icon, colorClass, bgClass }: any) => (
      <div className={`
        flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border transition-all
        ${darkMode 
            ? 'bg-slate-800/80 border-white/10 text-slate-100' 
            : 'bg-white/60 border-white/60 text-slate-800'}
        backdrop-blur-md shadow-sm
      `}>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0 ${bgClass}`}>
              <Icon size={20} className={colorClass} />
          </div>
          <div className="flex flex-col min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold opacity-50 uppercase tracking-wider mb-0.5 truncate">{label}</div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{value}</div>
          </div>
      </div>
  );

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 flex flex-col xl:flex-row gap-4 sm:gap-6">
        {/* Stats Row: Stack vertically on very small screens, 3 cols on tablet+ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 flex-1 xl:max-w-4xl">
            <StatItem 
                label="Total Tasks" 
                value={totalTasks} 
                icon={Briefcase}
                colorClass="text-blue-600 dark:text-blue-300"
                bgClass="bg-blue-100 dark:bg-blue-900/40"
            />
            <StatItem 
                label="Total Hours" 
                value={totalHours.toFixed(1)} 
                icon={Clock}
                colorClass="text-indigo-600 dark:text-indigo-300"
                bgClass="bg-indigo-100 dark:bg-indigo-900/40"
            />
            <StatItem 
                label="Critical P0/P1" 
                value={p1Count} 
                icon={Zap}
                colorClass="text-rose-600 dark:text-rose-300"
                bgClass="bg-rose-100 dark:bg-rose-900/40"
            />
        </div>

        {/* Chart Card - Hidden on very small screens if needed, or stacked */}
        <div className={`
            flex-1 hidden md:flex flex-col rounded-2xl border p-4 relative overflow-hidden backdrop-blur-md shadow-sm h-32 sm:h-auto
            ${darkMode ? 'bg-slate-800/80 border-white/10' : 'bg-white/60 border-white/60'}
        `}>
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <BarChart2 size={14} className="opacity-50 dark:text-white" />
                    <span className="text-xs font-bold uppercase opacity-60 tracking-wider dark:text-slate-300">Workload Top 10</span>
                 </div>
             </div>
             <div className="flex-1 min-h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4}>
                        <Tooltip 
                            contentStyle={{ 
                                fontSize: '11px', 
                                padding: '6px 12px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                color: darkMode ? '#fff' : '#1e293b',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}
                            cursor={{fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}}
                        />
                        <Bar 
                            dataKey="tasks" 
                            fill={darkMode ? '#818cf8' : '#6366f1'} 
                            radius={[4, 4, 4, 4]} 
                            barSize={18} 
                            fillOpacity={0.9}
                        />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>
    </div>
  );
};
