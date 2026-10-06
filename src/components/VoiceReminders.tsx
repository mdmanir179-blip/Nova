import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Plus,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Calendar,
  Sparkles,
  Play,
  RotateCcw
} from 'lucide-react';
import { soundFX, SpeechService } from '../utils/audioEngine';

export interface TaskReminder {
  id: string;
  title: string;
  scheduledTime: string; // ISO string or HH:mm
  voiceAnnouncement: string;
  category: 'Work' | 'Meeting' | 'Health' | 'Personal';
  priority: 'High' | 'Normal' | 'Urgent';
  completed: boolean;
  notified: boolean;
  language: string;
}

export const VoiceReminders: React.FC = () => {
  const [tasks, setTasks] = useState<TaskReminder[]>([
    {
      id: '1',
      title: 'প্রজেক্ট ডেলিভারি ও ক্লায়েন্ট কল',
      scheduledTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      voiceAnnouncement: 'বস, ক্লায়েন্টের প্রজেক্ট ডেলিভারি ও রিভিউ মিটিংয়ের সময় হয়েছে!',
      category: 'Work',
      priority: 'Urgent',
      completed: false,
      notified: false,
      language: 'bn-BD',
    },
    {
      id: '2',
      title: 'ওষুধ ও পানি পান করা',
      scheduledTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      voiceAnnouncement: 'বস, আপনার প্রয়োজনীয় ওষুধ খাওয়া এবং এক গ্লাস পানি পান করার সময় হয়েছে।',
      category: 'Health',
      priority: 'High',
      completed: false,
      notified: false,
      language: 'bn-BD',
    },
    {
      id: '3',
      title: 'Daily Code Review & Sync',
      scheduledTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      voiceAnnouncement: 'Boss, time for your team daily engineering sync and code review.',
      category: 'Meeting',
      priority: 'Normal',
      completed: false,
      notified: false,
      language: 'en-US',
    },
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newMinutesOffset, setNewMinutesOffset] = useState<number>(5);
  const [newCategory, setNewCategory] = useState<'Work' | 'Meeting' | 'Health' | 'Personal'>('Work');
  const [newPriority, setNewPriority] = useState<'High' | 'Normal' | 'Urgent'>('High');
  const [newLang, setNewLang] = useState('bn-BD');
  const [activeVoiceAlert, setActiveVoiceAlert] = useState<string | null>(null);

  // Background ticker checking for reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTasks((prevTasks) =>
        prevTasks.map((t) => {
          if (!t.completed && !t.notified) {
            const taskTime = new Date(t.scheduledTime).getTime();
            if (taskTime <= now) {
              // Trigger reminder!
              triggerVoiceNotification(t);
              return { ...t, notified: true };
            }
          }
          return t;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks]);

  const triggerVoiceNotification = (task: TaskReminder) => {
    soundFX.playReminderAlert();
    setActiveVoiceAlert(task.title);

    const message = task.voiceAnnouncement || `Attention! Time for your scheduled task: ${task.title}`;

    SpeechService.speak(message, {
      lang: task.language,
      rate: 1.0,
      pitch: 1.05,
      onEnd: () => {
        setTimeout(() => setActiveVoiceAlert(null), 3000);
      },
    });
  };

  const handleTestVoice = (text: string, lang: string) => {
    soundFX.playClick();
    SpeechService.speak(text, {
      lang,
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
        (newLang.startsWith('bn')
          ? `বস, আপনার কাজ: ${newTitle.trim()} করার সময় হয়েছে!`
          : `Boss, time for: ${newTitle.trim()}!`),
      category: newCategory,
      priority: newPriority,
      completed: false,
      notified: false,
      language: newLang,
    };

    setTasks([newTask, ...tasks]);
    setNewTitle('');
    setNewAnnouncement('');
  };

  const toggleComplete = (id: string) => {
    soundFX.playClick();
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    soundFX.playClick();
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Active Voice Alert Banner */}
      {activeVoiceAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/50 flex items-center justify-between shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <Volume2 className="text-cyan-400 animate-bounce" size={24} />
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-cyan-300 font-bold block">
                VOICE REMINDER BROADCASTING NOW
              </span>
              <p className="text-sm font-semibold text-white">{activeVoiceAlert}</p>
            </div>
          </div>
          <button
            onClick={() => SpeechService.stop()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-700"
          >
            Mute Voice
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bell size={22} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Voice Reminders & Task Engine</h3>
            <p className="text-xs text-neutral-400">
              Time-by-time scheduled voice notifications. NOVA speaks aloud when your tasks arrive.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Clock size={14} className="text-cyan-400" />
          <span>Active Watcher: 24/7 Monitoring</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Add New Task & Voice Reminder */}
        <div className="lg:col-span-5 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus size={16} className="text-cyan-400" />
            নতুন ভয়েস রিমাইন্ডার যোগ করুন (Add Voice Reminder)
          </h4>

          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="text-xs text-neutral-300 font-medium block mb-1">
                কাজের শিরোনাম (Task Title) *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (!newAnnouncement) {
                    setNewAnnouncement(
                      newLang.startsWith('bn')
                        ? `বস, আপনার কাজ: ${e.target.value} করার সময় হয়েছে!`
                        : `Boss, time for: ${e.target.value}!`
                    );
                  }
                }}
                placeholder="যেমন: ক্লায়েন্ট ইনভয়েস পাঠানো বা মিটিং"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-300 font-medium block mb-1">
                ভয়েস ঘোষণা বার্তা (Voice Announcement Script)
              </label>
              <input
                type="text"
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                placeholder="NOVA voice এ যা বলবে..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1">
                  সময় (Time Schedule)
                </label>
                <select
                  value={newMinutesOffset}
                  onChange={(e) => setNewMinutesOffset(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value={1}>১ মিনিট পর (1 min)</option>
                  <option value={5}>৫ মিনিট পর (5 mins)</option>
                  <option value={15}>১৫ মিনিট পর (15 mins)</option>
                  <option value={30}>৩০ মিনিট পর (30 mins)</option>
                  <option value={60}>১ ঘণ্টা পর (1 hour)</option>
                  <option value={180}>৩ ঘণ্টা পর (3 hours)</option>
                  <option value={1440}>২৪ ঘণ্টা পর (Tomorrow)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1">
                  ভাষা (Voice Language)
                </label>
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="bn-BD">বাংলা (Bengali)</option>
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">हिंदी (Hindi)</option>
                  <option value="ar-SA">عربي (Arabic)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1">
                  ক্যাটাগরি (Category)
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="Work">Work</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-300 font-medium block mb-1">
                  অগ্রাধিকার (Priority)
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-neutral-950 transition-colors shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              <span>রিমাইন্ডার সেট করুন (Set Voice Reminder)</span>
            </button>
          </form>
        </div>

        {/* Right List: Scheduled Reminders */}
        <div className="lg:col-span-7 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={16} className="text-purple-400" />
              তালিকাভুক্ত কাজ ও রিমাইন্ডার (Scheduled Reminders)
            </h4>
            <span className="text-xs text-neutral-400 font-mono">
              Total: {tasks.length}
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => {
              const diffMs = new Date(task.scheduledTime).getTime() - Date.now();
              const isPast = diffMs <= 0;
              const minsLeft = Math.round(diffMs / (60 * 1000));

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.completed
                      ? 'border-neutral-800 bg-neutral-950/40 opacity-60'
                      : 'border-neutral-800/80 bg-neutral-950/70 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleComplete(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          task.completed
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : 'border-neutral-700 hover:border-cyan-400 text-transparent'
                        }`}
                      >
                        <CheckCircle2 size={13} className={task.completed ? 'block' : 'hidden'} />
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5
                            className={`text-sm font-semibold text-white ${
                              task.completed ? 'line-through text-neutral-500' : ''
                            }`}
                          >
                            {task.title}
                          </h5>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                            {task.category}
                          </span>
                          {task.priority === 'Urgent' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                              Urgent
                            </span>
                          )}
                        </div>

                        {/* Voice script preview */}
                        <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1.5">
                          <Volume2 size={12} className="text-purple-400 shrink-0" />
                          <span>"{task.voiceAnnouncement}"</span>
                        </p>

                        <div className="text-[11px] text-neutral-500 mt-2 font-mono flex items-center gap-3">
                          <span>
                            Time: {new Date(task.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className={isPast ? 'text-emerald-400' : 'text-cyan-400 font-bold'}>
                            {isPast ? 'Alert Triggered' : `In ${minsLeft} minutes`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestVoice(task.voiceAnnouncement, task.language)}
                        title="ভয়েস টেস্ট করুন (Hear Voice Preview)"
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-cyan-400 transition-colors"
                      >
                        <Play size={13} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
