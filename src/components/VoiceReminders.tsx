import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Plus,
  Volume2,
  CheckCircle2,
  Trash2,
  Calendar,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { soundFX, SpeechService } from '../utils/audioEngine';

export interface TaskReminder {
  id: string;
  title: string;
  scheduledTime: string;
  voiceAnnouncement: string;
  category: 'Work' | 'Meeting' | 'Health' | 'Personal';
  priority: 'High' | 'Normal' | 'Urgent';
  completed: boolean;
  notified: boolean;
  language: string;
}

export const VoiceReminders: React.FC = () => {
  // Clean tasks state: NO demo data! Loaded from localStorage
  const [tasks, setTasks] = useState<TaskReminder[]>(() => {
    try {
      const saved = localStorage.getItem('ms_user_tasks') || localStorage.getItem('nova_user_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newTitle, setNewTitle] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newMinutesOffset, setNewMinutesOffset] = useState<number>(5);
  const [newCategory, setNewCategory] = useState<'Work' | 'Meeting' | 'Health' | 'Personal'>('Work');
  const [newPriority, setNewPriority] = useState<'High' | 'Normal' | 'Urgent'>('High');
  const [newLang, setNewLang] = useState('en-US');
  const [activeVoiceAlert, setActiveVoiceAlert] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ms_user_tasks', JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  // Background ticker checking for reminders every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          if (!t.completed && !t.notified) {
            const taskTime = new Date(t.scheduledTime).getTime();
            if (taskTime <= now) {
              triggerVoiceNotification(t);
              return { ...t, notified: true };
            }
          }
          return t;
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const triggerVoiceNotification = (task: TaskReminder) => {
    soundFX.playReminderAlert();
    setActiveVoiceAlert(task.title);

    const message = task.voiceAnnouncement || `Attention! It is time for your task: ${task.title}!`;

    SpeechService.speak(message, {
      lang: task.language || 'en-US',
      rate: 1.0,
      pitch: 1.05,
      onEnd: () => {
        setTimeout(() => setActiveVoiceAlert(null), 3000);
      },
    });
  };

  const handleTestVoice = (text: string, lang: string) => {
    soundFX.unlock();
    soundFX.playClick();
    SpeechService.speak(text, {
      lang: lang || 'en-US',
      rate: 1.0,
      pitch: 1.05,
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    soundFX.playActivateSound();
    const targetDate = new Date(Date.now() + newMinutesOffset * 60 * 1000);
    const newTask: TaskReminder = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      scheduledTime: targetDate.toISOString(),
      voiceAnnouncement:
        newAnnouncement.trim() ||
        `Boss, it is time for your task: ${newTitle.trim()}!`,
      category: newCategory,
      priority: newPriority,
      completed: false,
      notified: false,
      language: newLang,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle('');
    setNewAnnouncement('');
  };

  const toggleTaskCompleted = (id: string) => {
    soundFX.playClick();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    soundFX.playClick();
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAllTasks = () => {
    soundFX.playClick();
    setTasks([]);
    localStorage.removeItem('ms_user_tasks');
    localStorage.removeItem('nova_user_tasks');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert when Task Fires */}
      {activeVoiceAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-3">
            <Volume2 size={24} className="animate-pulse" />
            <div>
              <span className="text-xs uppercase tracking-widest text-purple-200 block">
                Voice Reminder Alarm
              </span>
              <span className="text-sm md:text-base">{activeVoiceAlert}</span>
            </div>
          </div>
          <button
            onClick={() => {
              SpeechService.stop();
              setActiveVoiceAlert(null);
            }}
            className="px-4 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-semibold backdrop-blur-md cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bell size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Voice Task Reminders</h3>
            <p className="text-xs text-neutral-400">
              Schedule your daily tasks and meetings. MS will vocalize reminders out loud when each deadline arrives.
            </p>
          </div>
        </div>

        {tasks.length > 0 && (
          <button
            onClick={clearAllTasks}
            className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (5 cols): Add New Reminder Form */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus size={16} className="text-purple-400" />
            Schedule New Voice Reminder
          </h4>

          <form onSubmit={handleAddTask} className="space-y-3.5">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Task Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Client Zoom Meeting, Drink Water, Submit Project"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Voice Announcement (What MS should speak out loud)
              </label>
              <textarea
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                rows={2}
                placeholder="e.g. Boss! Your meeting starts right now, please join the call."
                className="w-full p-3 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Quick Time Offsets */}
            <div>
              <label className="text-xs text-neutral-400 block mb-1.5">Remind Me In:</label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: '2 mins', val: 2 },
                  { label: '5 mins', val: 5 },
                  { label: '15 mins', val: 15 },
                  { label: '1 hour', val: 60 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setNewMinutesOffset(item.val)}
                    className={`py-2 rounded-xl font-medium transition-colors border cursor-pointer ${
                      newMinutesOffset === item.val
                        ? 'bg-purple-500 text-white border-purple-500 font-bold'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Work">Work</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>

            {/* Voice Language */}
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Voice Language</label>
              <select
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="en-US">English (US)</option>
                <option value="bn-BD">বাংলা (Bengali)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
                <option value="es-ES">Español (Spanish)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white transition-colors flex items-center justify-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer"
            >
              <Clock size={15} />
              <span>Set Voice Reminder</span>
            </button>
          </form>
        </div>

        {/* Right (7 cols): Active Reminders List */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={16} className="text-purple-400" />
              Active Reminders & Schedules
            </h4>
            <span className="text-xs font-mono text-neutral-400">
              {tasks.length} total
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="py-20 text-center text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-xl">
              <Clock size={32} className="mx-auto text-neutral-700" />
              <p className="text-xs text-neutral-400 font-medium">
                No reminders scheduled yet
              </p>
              <p className="text-[11px] text-neutral-500">
                Create a reminder on the left and MS will vocalize it when the time arrives.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {tasks.map((task) => {
                const target = new Date(task.scheduledTime);
                const isOverdue = target.getTime() < Date.now();

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-neutral-950/40 border-neutral-900 opacity-60'
                        : isOverdue
                        ? 'bg-purple-950/20 border-purple-500/40'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskCompleted(task.id)}
                          className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center transition-colors border cursor-pointer ${
                            task.completed
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'border-neutral-700 hover:border-purple-400'
                          }`}
                        >
                          {task.completed && <CheckCircle2 size={13} />}
                        </button>

                        <div className="space-y-1">
                          <span
                            className={`text-xs font-semibold block ${
                              task.completed
                                ? 'line-through text-neutral-500'
                                : 'text-neutral-100'
                            }`}
                          >
                            {task.title}
                          </span>

                          <p className="text-[11px] text-neutral-400">
                            {task.voiceAnnouncement}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono">
                            <span className="flex items-center gap-1 text-cyan-400">
                              <Clock size={11} />
                              {target.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                              {task.category}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full border ${
                                task.priority === 'Urgent'
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {task.priority}
                            </span>

                            {task.notified && (
                              <span className="text-emerald-400 font-semibold">
                                ✓ Notified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleTestVoice(task.voiceAnnouncement, task.language)
                          }
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-purple-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Preview Voice Notification"
                        >
                          <Play size={13} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                          title="Delete Reminder"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
