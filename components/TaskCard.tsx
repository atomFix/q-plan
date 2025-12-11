
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
      if (t.includes('需求')) return <Briefcase size={11} className="text-blue-500 dark:text-blue-400" />;
      if (t.includes('故障')) return <AlertCircle size={11} className="text-red-500 dark:text-red-400" />;
      if (t.includes('任务')) return <CheckCircle2 size={11} className="text-emerald-500 dark:text-emerald-400" />;
      return <Code size={11} className="text-slate-500 dark:text-slate-400" />;
  };

  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (task.task_id) {
          const url = `http://pmo.corp.qunar.com/browse/${task.task_id}`;
          window.open(url, '_blank', 'noopener,noreferrer');
      }
  };

  // Improved Dark Mode Logic:
  // Instead of relying on transparency, use solid dark colors with light borders for contrast.
  
  // Default (Light Mode)
  let bgGradient = "bg-gradient-to-br from-white/95 to-slate-50/90";
  let darkBg = "dark:bg-slate-800/95"; // Nearly opaque for dark mode legibility
  let borderColor = "border-white/50 dark:border-white/10";
  let textColor = "text-slate-700 dark:text-slate-200";
  
  const p = task.priority ? task.priority.toUpperCase() : '';
  let badgeBg = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  let dotColor = "bg-slate-400"; // Fallback dot color
  
  if (p.includes('P0')) { 
      badgeBg = "bg-rose-50 text-rose-600 dark:bg-rose-500/30 dark:text-rose-200 dark:border dark:border-rose-500/50";
      dotColor = "bg-rose-500";
      bgGradient = "bg-gradient-to-br from-white/95 to-rose-50/50";
      darkBg = "dark:bg-slate-800/95 dark:shadow-[inset_0_0_20px_rgba(225,29,72,0.1)]";
  } else if (p.includes('P1')) { 
      badgeBg = "bg-orange-50 text-orange-600 dark:bg-orange-500/30 dark:text-orange-200 dark:border dark:border-orange-500/50";
      dotColor = "bg-orange-500";
      bgGradient = "bg-gradient-to-br from-white/95 to-orange-50/50";
      darkBg = "dark:bg-slate-800/95 dark:shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]";
  } else if (p.includes('P2')) { 
      badgeBg = "bg-blue-50 text-blue-600 dark:bg-blue-500/30 dark:text-blue-200 dark:border dark:border-blue-500/50";
      dotColor = "bg-blue-500";
      bgGradient = "bg-gradient-to-br from-white/95 to-blue-50/50";
      darkBg = "dark:bg-slate-800/95 dark:shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]";
  } else if (p.includes('P3')) { 
      badgeBg = "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/30 dark:text-emerald-200 dark:border dark:border-emerald-500/50";
      dotColor = "bg-emerald-500";
      bgGradient = "bg-gradient-to-br from-white/95 to-emerald-50/50";
      darkBg = "dark:bg-slate-800/95 dark:shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]";
  }

  return (
    <div 
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className={`
        absolute rounded-xl cursor-pointer group
        flex flex-col overflow-hidden
        border ${borderColor}
        ${bgGradient} ${darkBg} ${textColor}
        shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)]
        transition-all duration-300 ease-out
        hover:z-50 hover:scale-[1.02] hover:-translate-y-1
        backdrop-blur-sm
      `}
      style={{
          ...style,
          height: '64px',
          padding: isSmall ? '8px' : '8px 12px',
          justifyContent: isSmall ? 'center' : 'space-between'
      }}
    >
        {/* Highlight for glass effect */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-60 dark:opacity-10" />

        {/* Top Row: Priority & Title */}
        <div className={`flex items-start ${isSmall ? 'gap-1.5' : 'gap-2.5'} w-full`}>
            
            {/* Priority Indicator */}
            {isSmall ? (
                // Small Mode: Dot
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${dotColor}`} />
            ) : (
                // Normal Mode: Badge
                <div className={`
                    flex items-center justify-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-extrabold leading-none flex-shrink-0 shadow-sm
                    ${badgeBg}
                `}>
                    {task.priority || 'N/A'}
                </div>
            )}
            
            {/* Title */}
            <div className={`flex-1 min-w-0 font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100 ${isSmall ? 'text-[11px] line-clamp-3' : 'text-xs line-clamp-2'}`} title={task.title}>
                {task.title}
            </div>
            
            {!isSmall && (
                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 text-blue-500 dark:text-blue-400" />
            )}
        </div>
        
        {/* Bottom Row: Only show if NOT small */}
        {!isSmall && (
            <div className="flex items-end justify-between mt-auto w-full">
                <div className="flex items-center gap-2 text-[10px] font-medium opacity-70 dark:opacity-60 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                        {getTypeIcon(task.type)}
                        <span className="truncate max-w-[80px]">{task.type}</span>
                    </div>
                    {task.task_id && (
                        <span className="font-mono text-[9px] opacity-60 hidden sm:inline tracking-wide">{task.task_id}</span>
                    )}
                </div>
                
                {task.work_hour ? (
                    <span className="text-[10px] font-bold font-mono bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 flex items-center shadow-sm border border-transparent dark:border-white/5">
                        {task.work_hour}h
                    </span>
                ) : (
                    <span className="text-[9px] bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                        {task.status}
                    </span>
                )}
            </div>
        )}
    </div>
  );
};
