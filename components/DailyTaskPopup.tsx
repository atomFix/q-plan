
import React, { useEffect, useState, useRef } from 'react';
import { Task } from '../types';
import { X, CalendarCheck, Clock, ArrowRight, ExternalLink } from 'lucide-react';

interface DailyTaskPopupProps {
    tasks: Task[];
    onClose: () => void;
}

export const DailyTaskPopup: React.FC<DailyTaskPopupProps> = ({ tasks, onClose }) => {
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
            className="fixed top-20 right-4 z-[150] w-80 rounded-2xl border shadow-2xl overflow-hidden animate-in slide-in-from-right-10 duration-500 backdrop-blur-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="p-4 pb-2 flex items-start justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <CalendarCheck size={18} />
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-sm leading-tight">Good Morning!</h3>
                        <p className="text-[10px] opacity-60 font-medium uppercase tracking-widest">
                            {tasks.length} Tasks for Today
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full transition-all hover:bg-black/5 hover:scale-110"
                >
                    <X size={16} className="opacity-50 hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Task List */}
            <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                    {tasks.map((task, idx) => {
                        const isHighPriority = task.priority.includes('P0') || task.priority.includes('P1');

                        return (
                            <div
                                key={`${task.task_id}-${idx}`}
                                onClick={() => handleTaskClick(task.task_id)}
                                className="group relative p-3 rounded-xl border transition-all cursor-pointer card-hover bg-gradient-to-br from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 border-slate-200 dark:border-slate-700"
                            >
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        isHighPriority ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-700/20 dark:bg-slate-300/20 text-slate-700 dark:text-slate-300'
                                    }`}>
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
                                    <span className="text-[10px] opacity-50 px-1 rounded bg-slate-900/10 dark:bg-slate-100/10">
                                        {task.status}
                                    </span>
                                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer / Progress Bar */}
            <div className="relative h-1 w-full bg-slate-700/40 dark:bg-slate-300/40">
                <div
                    className="absolute top-0 left-0 h-full transition-all duration-100 ease-linear bg-blue-600"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="px-4 py-2 text-[10px] text-center opacity-40 font-medium bg-slate-100 dark:bg-slate-700">
                {isHovered ? "Paused" : "Auto-closing in 10s"}
            </div>
        </div>
    );
};
