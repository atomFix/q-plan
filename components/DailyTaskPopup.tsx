
import React, { useEffect, useState, useRef } from 'react';
import { Task } from '../types';
import { X, CalendarCheck, Clock, ArrowRight, ExternalLink } from 'lucide-react';

interface DailyTaskPopupProps {
    tasks: Task[];
    onClose: () => void;
    darkMode: boolean;
}

export const DailyTaskPopup: React.FC<DailyTaskPopupProps> = ({ tasks, onClose, darkMode }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [progress, setProgress] = useState(100);
    const DURATION = 10000; // 10 seconds
    const INTERVAL = 100;
    
    // We use a ref to track the remaining time to handle pause/resume accurately
    const timeRemainingRef = useRef(DURATION);
    const lastTickRef = useRef(Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            if (isHovered) {
                // Update last tick so when we resume, we don't jump
                lastTickRef.current = Date.now();
                return;
            }

            const now = Date.now();
            const delta = now - lastTickRef.current;
            lastTickRef.current = now;

            timeRemainingRef.current -= delta;

            // Update visual progress bar
            setProgress((timeRemainingRef.current / DURATION) * 100);

            if (timeRemainingRef.current <= 0) {
                clearInterval(timer);
                onClose();
            }
        }, INTERVAL);

        return () => clearInterval(timer);
    }, [isHovered, onClose]);

    const handleTaskClick = (taskId: string) => {
        if (!taskId) return;
        const url = `http://pmo.corp.qunar.com/browse/${taskId}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (tasks.length === 0) return null;

    return (
        <div 
            className={`fixed top-20 right-4 z-[60] w-80 rounded-2xl border shadow-2xl overflow-hidden animate-in slide-in-from-right-10 duration-500
                ${darkMode ? 'bg-slate-900/90 border-white/10 text-slate-100' : 'bg-white/90 border-slate-200 text-slate-800'}
                backdrop-blur-xl
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className={`p-4 pb-2 flex items-start justify-between ${darkMode ? 'bg-white/5' : 'bg-blue-50/50'}`}>
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                        <CalendarCheck size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">Good Morning!</h3>
                        <p className="text-[10px] opacity-60 font-medium uppercase tracking-wider">
                            {tasks.length} Tasks for Today
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className={`p-1 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                >
                    <X size={16} className="opacity-50 hover:opacity-100" />
                </button>
            </div>

            {/* Task List */}
            <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                    {tasks.map((task, idx) => (
                        <div 
                            key={`${task.task_id}-${idx}`}
                            onClick={() => handleTaskClick(task.task_id)}
                            className={`group relative p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]
                                ${darkMode 
                                    ? 'bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/20' 
                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}
                            `}
                        >
                            <div className="flex justify-between items-start gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                                    ${task.priority.includes('P0') || task.priority.includes('P1') 
                                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300' 
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400'}
                                `}>
                                    {task.priority}
                                </span>
                                {task.work_hour && (
                                    <div className="flex items-center gap-1 text-[10px] opacity-60 font-mono">
                                        <Clock size={10} />
                                        <span>{task.work_hour}h</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-xs font-semibold leading-snug line-clamp-2 mb-1">
                                {task.title}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[10px] opacity-50 bg-white/10 px-1 rounded">{task.status}</span>
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer / Progress Bar */}
            <div className="relative h-1 w-full bg-gray-200 dark:bg-gray-800">
                <div 
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
            
            <div className={`px-4 py-2 text-[10px] text-center opacity-40 font-medium ${darkMode ? 'bg-black/20' : 'bg-slate-50'}`}>
                {isHovered ? "Paused" : "Auto-closing in 10s"}
            </div>
        </div>
    );
};
