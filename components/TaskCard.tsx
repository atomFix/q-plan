
import React from 'react';
import { Task } from '../types';
import { Code, Briefcase, Clock, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  style?: React.CSSProperties;
  isSmall?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, style, isSmall, onContextMenu }) => {

  const getTypeIcon = (t: string) => {
      if (t.includes('需求')) return <Briefcase size={11} className="text-amber-600 dark:text-amber-400" />;
      if (t.includes('故障')) return <AlertCircle size={11} className="text-rose-500 dark:text-rose-400" />;
      if (t.includes('任务')) return <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />;
      return <Code size={11} className="text-indigo-500 dark:text-indigo-400" />;
  };

  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (task.task_id) {
          const url = `http://pmo.corp.qunar.com/browse/${task.task_id}`;
          window.open(url, '_blank', 'noopener,noreferrer');
      }
  };

  // Priority-based styling - Soft UI Evolution with modern depth and shadows
  const p = task.priority ? task.priority.toUpperCase() : '';

  // Enhanced palette with purple-based primary and better contrast
  let bgClass = 'bg-white dark:bg-slate-800';
  let borderClass = 'border-slate-200 dark:border-slate-700';
  let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  let accentColor = '#94a3b8'; // slate-400
  let shadowClass = 'shadow-sm hover:shadow-md';

  if (p.includes('P0')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-rose-200 dark:border-rose-900/40';
      badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
      accentColor = '#e11d48'; // rose-600 (darker for better contrast)
      shadowClass = 'shadow-sm hover:shadow-lg hover:shadow-rose-500/10';
  } else if (p.includes('P1')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-orange-200 dark:border-orange-900/40';
      badgeClass = 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
      accentColor = '#ea580c'; // orange-600
      shadowClass = 'shadow-sm hover:shadow-lg hover:shadow-orange-500/10';
  } else if (p.includes('P2')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-violet-200 dark:border-violet-900/40';
      badgeClass = 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
      accentColor = '#7c3aed'; // violet-600 (new purple primary)
      shadowClass = 'shadow-sm hover:shadow-lg hover:shadow-violet-500/10';
  } else if (p.includes('P3')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-slate-200 dark:border-slate-700';
      badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      accentColor = '#94a3b8'; // slate-400
      shadowClass = 'shadow-sm hover:shadow-md';
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className={`absolute rounded-xl cursor-pointer group flex overflow-hidden border ${bgClass} ${borderClass} ${shadowClass} transition-all duration-250 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none`}
      style={{
          ...style,
          height: '64px',
          borderLeftWidth: '4px',
          borderLeftColor: accentColor,
      }}
      tabIndex={0}
      role="button"
      aria-label={`Task: ${task.title} (Priority: ${task.priority || 'N/A'})`}
    >
        <div className="flex flex-col w-full px-3.5 py-2.5 justify-between">
            {/* Top Row: Priority & Title */}
            <div className="flex items-start gap-2 w-full min-w-0">
                {/* Priority Badge */}
                {!isSmall && (
                    <div className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold leading-none tracking-wide shadow-sm ${badgeClass} whitespace-nowrap`}>
                        {task.priority || 'N/A'}
                    </div>
                )}

                {/* Title - prevent wrapping */}
                <div className={`flex-1 min-w-0 font-semibold leading-snug ${isSmall ? 'text-[11px]' : 'text-xs'} text-slate-900 dark:text-slate-50`} title={task.title}>
                    <span className="block truncate">{task.title}</span>
                </div>

                {!isSmall && (
                    <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                )}
            </div>

            {/* Bottom Row: Type & Hours/Status */}
            {!isSmall && (
                <div className="flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 min-w-0">
                        <div className="flex-shrink-0">
                            {getTypeIcon(task.type)}
                        </div>
                        <span className="truncate font-medium">{task.type}</span>
                        {task.task_id && (
                            <span className="font-mono text-[9px] opacity-50 flex-shrink-0 hidden sm:inline">
                                {task.task_id}
                            </span>
                        )}
                    </div>

                    {task.work_hour ? (
                        <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 shadow-sm">
                            {task.work_hour}h
                        </span>
                    ) : (
                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            {task.status}
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
