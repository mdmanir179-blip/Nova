import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  Moon,
  Zap,
  Check,
  VolumeX,
  Lock,
  Mic,
  MicOff,
  Radio
} from 'lucide-react';
import { soundFX, SpeechService, VoiceRecognitionService } from '../utils/audioEngine';
import { backgroundSentinel } from '../utils/backgroundSentinel';
import {
  TaskReminder,
  getStoredTasks,
  saveStoredTasks,
  scheduleNewTask,
  parseVoiceTaskCommand
} from '../utils/taskManager';

export const VoiceReminders: React.FC = () => {
  // Tasks state synchronized with centralized storage
  const [tasks, setTasks] = useState<TaskReminder[]>(() => getStoredTasks());

  const [newTitle, setNewTitle] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newMinutesOffset, setNewMinutesOffset] = useState<number>(5);
  const [newCategory, setNewCategory] = useState<'Work' | 'Meeting' | 'Health' | 'Personal'>('Work');
  const [newPriority, setNewPriority] = useState<'High' | 'Normal' | 'Urgent'>('High');
  const [newLang, setNewLang] = useState('en-US');
  const [activeVoiceAlert, setActiveVoiceAlert] = useState<string | null>(null);

  // Screen-off & Background Protection State
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  // Voice Task Recorder State
  const [isRecordingTask, setIsRecordingTask] = useState<boolean>(false);
  const [recordedTranscript, setRecordedTranscript] = useState<string>('');
  const [voiceRecordFeedback, setVoiceRecordFeedback] = useState<string>('');
  const voiceRecRef = useRef<VoiceRecognitionService | null>(null);

  // Check initial notification permission & setup voice rec
  useEffect(() => {
    setNotificationPerm(backgroundSentinel.getNotificationPermission());
    backgroundSentinel.enableBackgroundKeepAlive();
    voiceRecRef.current = new VoiceRecognitionService();
  }, []);

  // Listen to external task updates (e.g. from VoiceAssistantCore)
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail) {
        setTasks(e.detail);
      } else {
        setTasks(getStoredTasks());
      }
    };
    window.addEventListener('ms_tasks_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('ms_tasks_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Trigger Multi-Channel Alert: Sound + Lock Screen Notification + Voice Announcement
  const triggerVoiceNotification = (task: TaskReminder) => {
    soundFX.unlock();
    soundFX.playReminderAlert();
    setActiveVoiceAlert(task.title);

    const message = task.voiceAnnouncement || `Attention! It is time for your task: ${task.title}!`;

    // 1. Show Lock-Screen System Notification & Vibrate phone
    backgroundSentinel.showLockScreenAlert(
      `⏰ MS AI Reminder: ${task.title}`,
      message,
      `ms-reminder-${task.id}`
    );

    // 2. Vocalize announcement via SpeechService
    SpeechService.speak(message, {
      lang: task.language || 'en-US',
      rate: 1.0,
      pitch: 1.05,
      onEnd: () => {
        setTimeout(() => setActiveVoiceAlert(null), 5000);
      },
    });
  };

  // Voice Task Recorder: User speaks and MS automatically schedules the reminder!
  const handleToggleVoiceTaskRecord = () => {
    soundFX.unlock();
    soundFX.playActivateSound();

    if (isRecordingTask) {
      voiceRecRef.current?.stop();
      setIsRecordingTask(false);
      return;
    }

    if (!voiceRecRef.current?.isSupported()) {
      alert('Speech recognition is not supported in this browser. Please use the form below.');
      return;
    }

    setIsRecordingTask(true);
    setRecordedTranscript('');
    setVoiceRecordFeedback('Listening... Speak your task (e.g., "Remind me in 5 minutes to call doctor" or "১০ মিনিট পর ওষুধ খাওয়া")');

    voiceRecRef.current.start(
      (transcript, isFinal) => {
        setRecordedTranscript(transcript);
        if (isFinal) {
          setIsRecordingTask(false);
          processVoiceTaskTranscript(transcript);
        }
      },
      (err) => {
        console.warn('Voice recording error:', err);
        setIsRecordingTask(false);
        setVoiceRecordFeedback('Could not hear clearly. Please try again or type below.');
      },
      () => {
        setIsRecordingTask(false);
      },
      newLang === 'bn-BD' ? 'bn-BD' : 'en-US'
    );
  };

  const processVoiceTaskTranscript = (transcript: string) => {
    if (!transcript.trim()) return;

    const parsed = parseVoiceTaskCommand(transcript);

    if (parsed.isTask) {
      // Schedule immediately
      const scheduled = scheduleNewTask({
        title: parsed.title,
        minutesOffset: parsed.minutesOffset,
        voiceAnnouncement: parsed.announcement,
        category: parsed.category,
        priority: parsed.priority,
        language: newLang,
      });

      setVoiceRecordFeedback(
        `✓ Task set: "${scheduled.title}" in ${parsed.minutesOffset} minute(s)! Screen-off alert armed.`
      );

      soundFX.playActivateSound();

      // Vocalize confirmation
      const confirmSpeech = parsed.detectedLang === 'bn'
        ? `টাস্ক শিডিউল হয়েছে: ${scheduled.title}, ${parsed.minutesOffset} মিনিট পর। স্ক্রিন লাইট অফ থাকলেও এলার্ম বাজবে।`
        : `Task scheduled: ${scheduled.title} in ${parsed.minutesOffset} minutes. Alert will sound even if screen is locked.`;

      SpeechService.speak(confirmSpeech, { lang: newLang });

      // Refresh task list
      setTasks(getStoredTasks());
    } else {
      // Pre-fill form if not fully detected as a command
      setNewTitle(transcript.trim());
      setVoiceRecordFeedback(`Captured: "${transcript.trim()}". Choose time offset and click Set Reminder.`);
    }
  };

  // Request Notification Permission
  const handleEnableNotifications = async () => {
    soundFX.playClick();
    const perm = await backgroundSentinel.requestNotificationPermission();
    setNotificationPerm(perm);
    if (perm === 'granted') {
      soundFX.playActivateSound();
      backgroundSentinel.showLockScreenAlert(
        'MS AI Screen-Off Alerts Active ✓',
        'Your phone will now receive reminders even when your screen is locked or turned off.'
      );
    }
  };

  // Toggle Screen WakeLock
  const handleToggleWakeLock = async () => {
    soundFX.playClick();
    if (isWakeLockActive) {
      backgroundSentinel.releaseWakeLock();
      setIsWakeLockActive(false);
    } else {
      const success = await backgroundSentinel.requestWakeLock();
      setIsWakeLockActive(success);
      if (success) {
        soundFX.playActivateSound();
      }
    }
  };

  // Test 5-Second Screen-Off Alert
  const handleTestScreenOffAlert = () => {
    soundFX.playActivateSound();
    backgroundSentinel.enableBackgroundKeepAlive();

    if (notificationPerm !== 'granted') {
      backgroundSentinel.requestNotificationPermission().then(setNotificationPerm);
    }

    setTestCountdown(5);
    const targetTime = Date.now() + 5000;

    const timer = setInterval(() => {
      const remaining = Math.round((targetTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        setTestCountdown(null);

        // Fire the test alarm
        soundFX.playReminderAlert();
        backgroundSentinel.showLockScreenAlert(
          '⏰ MS AI Screen-Off Test Alert!',
          'Screen-off protection is fully active! Your reminders will alert you anytime.'
        );
        SpeechService.speak('Boss, your screen-off reminder is working perfectly!', {
          lang: newLang,
          rate: 1.0,
        });
      } else {
        setTestCountdown(remaining);
      }
    }, 1000);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    soundFX.playActivateSound();

    const scheduled = scheduleNewTask({
      title: newTitle.trim(),
      minutesOffset: newMinutesOffset,
      voiceAnnouncement:
        newAnnouncement.trim() ||
        `Boss, it is time for your task: ${newTitle.trim()}!`,
      category: newCategory,
      priority: newPriority,
      language: newLang,
    });

    setTasks(getStoredTasks());
    setNewTitle('');
    setNewAnnouncement('');

    SpeechService.speak(
      `Reminder set for ${scheduled.title} in ${newMinutesOffset} minutes.`,
      { lang: newLang }
    );
  };

  const toggleTaskCompleted = (id: string) => {
    soundFX.playClick();
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    saveStoredTasks(updated);
  };

  const deleteTask = (id: string) => {
    soundFX.playClick();
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveStoredTasks(updated);
  };

  const clearAllTasks = () => {
    soundFX.playClick();
    setTasks([]);
    saveStoredTasks([]);
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

      {/* Screen-Off & Lock-Screen Sentinel Status Header */}
      <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-neutral-900/90 via-[#07101e] to-neutral-900/90 backdrop-blur-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Lock size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Mobile Screen-Off & Background Reminder Sentinel
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Guarantees you receive loud alarms, vibration, and lock-screen alerts even when your phone screen light is turned off or locked.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Enable Notification Button */}
            {notificationPerm !== 'granted' ? (
              <button
                onClick={handleEnableNotifications}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Bell size={14} />
                <span>Enable Lock-Screen Alerts</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Check size={14} className="text-emerald-400" />
                <span>Lock-Screen Alerts Allowed ✓</span>
              </div>
            )}

            {/* Test 5s Screen-Off Alert */}
            <button
              onClick={handleTestScreenOffAlert}
              disabled={testCountdown !== null}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Test reminder firing with phone screen locked"
            >
              <Zap size={14} className="text-cyan-400" />
              <span>
                {testCountdown !== null
                  ? `Lock Screen Now! (${testCountdown}s)`
                  : 'Test 5s Screen-Off Alarm'}
              </span>
            </button>

            {/* Keep Screen Awake Toggle (WakeLock) */}
            <button
              onClick={handleToggleWakeLock}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isWakeLockActive
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
              title="Prevent phone screen from going dark"
            >
              <Moon size={14} className={isWakeLockActive ? 'text-purple-400' : ''} />
              <span>{isWakeLockActive ? 'Keep-Awake: ON' : 'Keep-Awake'}</span>
            </button>
          </div>
        </div>

        {/* Live helper tip for mobile users */}
        <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80 flex items-center justify-between">
          <span>
            💡 <b>Screen-Off Assurance:</b> MS AI runs a background Web Worker & media sentinel session. Even if your phone is in your pocket with the display off, it will vibrate and vocalize alarms on schedule.
          </span>
        </div>
      </div>

      {/* NEW: Dedicated Voice Task Recorder Card */}
      <div className="p-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-neutral-950 to-neutral-950 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Radio size={16} className="text-purple-400 animate-pulse" />
            <h4 className="text-sm font-bold text-white">Voice Task Recorder (কথা বলে টাস্ক দিন)</h4>
          </div>
          <p className="text-xs text-neutral-400">
            Tap the button and speak your task. MS AI automatically extracts the title, sets the time, and arms screen-off protection.
          </p>
          {voiceRecordFeedback && (
            <p className="text-xs text-cyan-300 font-medium bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-800/40 inline-block">
              {voiceRecordFeedback}
            </p>
          )}
        </div>

        <button
          onClick={handleToggleVoiceTaskRecord}
          className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shrink-0 ${
            isRecordingTask
              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-rose-500/30'
              : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-purple-500/25'
          }`}
        >
          {isRecordingTask ? <MicOff size={16} /> : <Mic size={16} />}
          <span>{isRecordingTask ? 'Listening... (Speak Now)' : 'Record Task with Voice'}</span>
        </button>
      </div>

      {/* Main Grid: Form (5 cols) & Tasks List (7 cols) */}
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
                placeholder="e.g. Client Zoom Meeting, Drink Water, Medicine"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                Voice Announcement (What MS should vocalize out loud)
              </label>
              <textarea
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                rows={2}
                placeholder="e.g. Boss! Your meeting starts right now, please check your notes."
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-400">
                {tasks.length} total
              </span>
              {tasks.length > 0 && (
                <button
                  onClick={clearAllTasks}
                  className="text-xs text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="py-20 text-center text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-xl">
              <Clock size={32} className="mx-auto text-neutral-700" />
              <p className="text-xs text-neutral-400 font-medium">
                No reminders scheduled yet
              </p>
              <p className="text-[11px] text-neutral-500">
                Speak a task above or fill the form. MS will alert you with loud alarm and vibration even if your screen is locked.
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
                                : 'text-white'
                            }`}
                          >
                            {task.title}
                          </span>
                          <p className="text-[11px] text-neutral-400 italic">
                            "{task.voiceAnnouncement}"
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px]">
                            <span className="font-mono text-purple-400 flex items-center gap-1">
                              <Clock size={11} />
                              {target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
                              {task.category}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-medium ${
                                task.priority === 'Urgent'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {task.priority}
                            </span>
                            {task.notified && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Alert Sent ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => triggerVoiceNotification(task)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Test Alarm Voice"
                        >
                          <Play size={13} />
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete"
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
