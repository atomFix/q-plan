
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

  // Priority-based styling - Clean, minimal system
  const p = task.priority ? task.priority.toUpperCase() : '';

  // Minimal palette - solid colors, no gradients
  let bgClass = 'bg-white dark:bg-slate-800';
  let borderClass = 'border-slate-200 dark:border-slate-700';
  let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  let accentColor = '#94a3b8'; // slate-400

  if (p.includes('P0')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-rose-200 dark:border-rose-900/30';
      badgeClass = 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      accentColor = '#f43f5e'; // rose-500
  } else if (p.includes('P1')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-orange-200 dark:border-orange-900/30';
      badgeClass = 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      accentColor = '#f97316'; // orange-500
  } else if (p.includes('P2')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-blue-200 dark:border-blue-900/30';
      badgeClass = 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      accentColor = '#3b82f6'; // blue-500
  } else if (p.includes('P3')) {
      bgClass = 'bg-white dark:bg-slate-800';
      borderClass = 'border-slate-200 dark:border-slate-700';
      badgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
      accentColor = '#94a3b8'; // slate-400
  }

  return (
    <div
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className={`absolute rounded-lg cursor-pointer group flex overflow-hidden border ${bgClass} ${borderClass} hover:shadow-md transition-all duration-200`}
      style={{
          ...style,
          height: '64px',
          borderLeftWidth: '3px',
          borderLeftColor: accentColor,
      }}
    >
        <div className="flex flex-col w-full px-3 py-2 justify-between">
            {/* Top Row: Priority & Title */}
            <div className="flex items-start gap-2 w-full min-w-0">
                {/* Priority Badge */}
                {!isSmall && (
                    <div className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${badgeClass} whitespace-nowrap`}>
                        {task.priority || 'N/A'}
                    </div>
                )}

                {/* Title - prevent wrapping */}
                <div className={`flex-1 min-w-0 font-medium leading-snug text-slate-800 dark:text-slate-100 ${isSmall ? 'text-[11px]' : 'text-xs'}`} title={task.title}>
                    <span className="block truncate">{task.title}</span>
                </div>

                {!isSmall && (
                    <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-slate-400 dark:text-slate-500" />
                )}
            </div>

            {/* Bottom Row: Type & Hours/Status */}
            {!isSmall && (
                <div className="flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 min-w-0">
                        <div className="flex-shrink-0">
                            {getTypeIcon(task.type)}
                        </div>
                        <span className="truncate">{task.type}</span>
                        {task.task_id && (
                            <span className="font-mono text-[9px] opacity-40 flex-shrink-0 hidden sm:inline">
                                {task.task_id}
                            </span>
                        )}
                    </div>

                    {task.work_hour ? (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700">
                            {task.work_hour}h
                        </span>
                    ) : (
                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800">
                            {task.status}
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
