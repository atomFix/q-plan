
import React from 'react';
import { EmployeePlan, DailyPlan } from '../types';
import { Briefcase, Clock, Zap, BarChart2 } from 'lucide-react';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsPanelProps {
  employees: EmployeePlan[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ employees }) => {
  let totalTasks = 0;
  let totalHours = 0;
  let p1Count = 0;
  let employeeTaskCounts: { name: string; tasks: number }[] = [];

  employees.forEach(emp => {
    let empTaskCount = 0;
    Object.values(emp.daily_plans).forEach((day: DailyPlan) => {
        // Validate task_count before adding
        const count = parseInt(day.task_count) || 0;
        if (count > 0) {
            totalTasks += count;
            empTaskCount += count;
        }
        day.tasks.forEach(t => {
            // Safely parse work hour
            if (t.work_hour && !isNaN(parseFloat(t.work_hour))) {
                totalHours += parseFloat(t.work_hour);
            }
            // Count critical tasks
            if (t.priority === 'P0' || t.priority === 'P1') {
                p1Count++;
            }
        });
    });
    employeeTaskCounts.push({ name: emp.name, tasks: empTaskCount });
  });

  const chartData = employeeTaskCounts
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 10);

  const StatItem = ({ label, value, icon: Icon, delay = 0 }: any) => (
      <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm fade-in-up`} style={{ animationDelay: `${delay}ms` }}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-700">
              <Icon size={20} className="text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex flex-col min-w-0">
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-0.5 truncate text-slate-500 dark:text-slate-400">{label}</div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">{typeof value === 'number' ? value.toLocaleString() : value}</div>
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
                delay={0}
            />
            <StatItem
                label="Total Hours"
                value={totalHours.toFixed(1)}
                icon={Clock}
                delay={100}
            />
            <StatItem
                label="Critical P0/P1"
                value={p1Count}
                icon={Zap}
                delay={200}
            />
        </div>

        {/* Chart Card - Hidden on very small screens if needed, or stacked */}
        <div className="flex-1 hidden md:flex flex-col rounded-xl border p-4 shadow-sm h-32 sm:h-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 fade-in-up" style={{ animationDelay: '300ms' }}>
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <BarChart2 size={14} className="text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Workload Top 10</span>
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
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#1e293b',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}
                            cursor={{fill: '#f1f5f9'}}
                        />
                        <Bar
                            dataKey="tasks"
                            fill="#3b82f6"
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
