import React, { useEffect } from 'react';
import { Bell, Volume2, CheckCircle2, Clock, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { TaskReminder } from '../utils/taskManager';
import { soundFX, SpeechService } from '../utils/audioEngine';

interface GlobalAlarmModalProps {
  task: TaskReminder | null;
  onDismiss: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
}

export const GlobalAlarmModal: React.FC<GlobalAlarmModalProps> = ({
  task,
  onDismiss,
  onSnooze,
}) => {
  if (!task) return null;

  // Repeat alarm chime every 3 seconds while modal is open
  useEffect(() => {
    soundFX.unlock();
    soundFX.playReminderAlert();

    const interval = setInterval(() => {
      soundFX.playReminderAlert();
    }, 4000);

    return () => clearInterval(interval);
  }, [task]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-md p-6 rounded-3xl border-2 border-purple-500/80 bg-gradient-to-b from-neutral-900 via-[#0c0817] to-neutral-950 shadow-2xl shadow-purple-500/40 text-center space-y-5">
        {/* Glowing Pulsing Alarm Bell */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-0.5 shadow-xl shadow-purple-500/50 animate-bounce">
          <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center text-amber-300">
            <Bell size={40} className="animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider animate-pulse">
            <AlertTriangle size={13} />
            <span>Task Alarm Alert</span>
          </div>

          <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            {task.title}
          </h3>

          <p className="text-sm text-purple-200/90 italic bg-purple-950/40 p-3 rounded-2xl border border-purple-800/40">
            "{task.voiceAnnouncement || `Time for your task: ${task.title}`}"
          </p>

          <div className="flex items-center justify-center gap-4 text-xs font-mono text-neutral-400 pt-1">
            <span>Scheduled: {new Date(task.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{task.priority} Priority</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Snooze 5 Mins */}
          <button
            onClick={() => {
              SpeechService.stop();
              onSnooze(task.id, 5);
            }}
            className="py-3 px-4 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>Snooze (5m)</span>
          </button>

          {/* Dismiss & Completed */}
          <button
            onClick={() => {
              SpeechService.stop();
              onDismiss(task.id);
            }}
            className="py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>Complete / Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
};
