import { soundFX, SpeechService } from './audioEngine';
import { backgroundSentinel } from './backgroundSentinel';

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

const STORAGE_KEY = 'ms_user_tasks';
const LEGACY_KEY = 'nova_user_tasks';

// Load tasks from storage
export function getStoredTasks(): TaskReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save tasks to storage and notify listeners
export function saveStoredTasks(tasks: TaskReminder[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent('ms_tasks_updated', { detail: tasks }));
  } catch (err) {
    console.warn('Could not save tasks:', err);
  }
}

// Convert Bengali numerals to standard numbers
function normalizeNumbers(str: string): string {
  const bnToEn: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return str.replace(/[০-৯]/g, (ch) => bnToEn[ch] || ch);
}

export interface ParsedVoiceTask {
  isTask: boolean;
  title: string;
  minutesOffset: number;
  announcement: string;
  category: 'Work' | 'Meeting' | 'Health' | 'Personal';
  priority: 'High' | 'Normal' | 'Urgent';
  detectedLang: 'en' | 'bn';
}

/**
 * Intelligent voice & text parser for Task Reminders in both English & Bengali
 * Handles phrases like:
 * - "Remind me in 5 minutes to take medicine"
 * - "Set task to call doctor in 10 minutes"
 * - "Remind me to submit report in 2 minutes"
 * - "৫ মিনিট পর ওষুধ খাওয়ার কথা মনে করিয়ে দাও"
 * - "১০ মিনিট পর মিটিং এর রিমাইন্ডার দাও"
 * - "২ মিনিট পর টাস্ক দাও পানি খেতে"
 */
export function parseVoiceTaskCommand(input: string): ParsedVoiceTask {
  const normalized = normalizeNumbers(input.trim());
  const lower = normalized.toLowerCase();

  const isBengali = /[\u0980-\u09FF]/.test(normalized);

  // Bengali trigger keywords
  const bnTriggers = [
    'মনে করিয়ে', 'মনে করাও', 'মনে করিয়ে দিও', 'মনে করিয়ে দাও',
    'রিমাইন্ডার', 'টাস্ক', 'এলার্ম', 'মিনিট পর', 'ঘণ্টা পর', 'ঘন্টা পর'
  ];

  // English trigger keywords
  const enTriggers = [
    'remind me', 'set a reminder', 'set reminder', 'set task', 'create task',
    'schedule task', 'alarm in', 'reminder for', 'remind to', 'in 1 minute',
    'in 2 minutes', 'in 5 minutes', 'in 10 minutes', 'in 15 minutes', 'in 30 minutes',
    'in 1 hour'
  ];

  const hasBnMatch = bnTriggers.some((t) => lower.includes(t));
  const hasEnMatch = enTriggers.some((t) => lower.includes(t));

  if (!hasBnMatch && !hasEnMatch) {
    return {
      isTask: false,
      title: '',
      minutesOffset: 5,
      announcement: '',
      category: 'Work',
      priority: 'High',
      detectedLang: isBengali ? 'bn' : 'en'
    };
  }

  // 1. Extract minutes offset
  let minutes = 5; // default 5 minutes
  const minuteMatch = normalized.match(/(\d+)\s*(?:minute|min|মিনিট|মিঃ)/i);
  const hourMatch = normalized.match(/(\d+)\s*(?:hour|hr|ঘণ্টা|ঘন্টা)/i);
  const secMatch = normalized.match(/(\d+)\s*(?:second|sec|সেকেন্ড)/i);

  if (minuteMatch) {
    minutes = Math.max(1, parseInt(minuteMatch[1], 10));
  } else if (hourMatch) {
    minutes = Math.max(1, parseInt(hourMatch[1], 10) * 60);
  } else if (secMatch) {
    // Round small seconds to 1 min for stability
    minutes = 1;
  }

  // 2. Extract Title
  let title = '';

  if (isBengali) {
    // Strip common filler phrases in Bengali
    let cleaned = normalized
      .replace(/(\d+)\s*(?:মিনিট|ঘণ্টা|ঘন্টা|সেকেন্ড)\s*পর/gi, '')
      .replace(/(?:আমাকে|আমায়|একটু|দয়া করে|প্লিজ)\s*/gi, '')
      .replace(/(?:মনে করিয়ে দিও|মনে করিয়ে দাও|মনে করাও|রিমাইন্ডার দাও|টাস্ক দাও|টাস্ক সেট করো)/gi, '')
      .replace(/(?:এর কথা|কথা|জন্য|টাস্ক)\s*/gi, '')
      .trim();

    title = cleaned || 'গুরুত্বপূর্ণ কাজ (Important Task)';
  } else {
    // English cleaning
    let cleaned = normalized
      .replace(/remind me\s+(?:in\s+\d+\s+(?:minutes?|mins?|hours?|hrs?)\s+to|to\s+)?/i, '')
      .replace(/(?:in\s+\d+\s+(?:minutes?|mins?|hours?|hrs?))/i, '')
      .replace(/(?:set\s+(?:a\s+)?(?:task|reminder)\s+(?:to|for)?)/i, '')
      .replace(/(?:please|hey ms|ms)\s*/i, '')
      .trim();

    title = cleaned || 'Important Scheduled Task';
  }

  // Category detection
  let category: 'Work' | 'Meeting' | 'Health' | 'Personal' = 'Work';
  const cLower = (title + ' ' + normalized).toLowerCase();
  if (cLower.includes('meeting') || cLower.includes('মিটিং') || cLower.includes('zoom') || cLower.includes('call')) {
    category = 'Meeting';
  } else if (cLower.includes('medicine') || cLower.includes('ওষুধ') || cLower.includes('পানি') || cLower.includes('water') || cLower.includes('gym') || cLower.includes('health') || cLower.includes('doctor')) {
    category = 'Health';
  } else if (cLower.includes('buy') || cLower.includes('market') || cLower.includes('bazar') || cLower.includes('বাজার') || cLower.includes('home') || cLower.includes('family')) {
    category = 'Personal';
  }

  const announcement = isBengali
    ? `বস, আপনার টাস্কের সময় হয়েছে: ${title}!`
    : `Boss, it is time for your scheduled task: ${title}!`;

  return {
    isTask: true,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    minutesOffset: minutes,
    announcement,
    category,
    priority: minutes <= 5 ? 'Urgent' : 'High',
    detectedLang: isBengali ? 'bn' : 'en'
  };
}

/**
 * Schedule a new task reminder and ensure mobile screen-off protection is armed
 */
export function scheduleNewTask(params: {
  title: string;
  minutesOffset: number;
  voiceAnnouncement?: string;
  category?: 'Work' | 'Meeting' | 'Health' | 'Personal';
  priority?: 'High' | 'Normal' | 'Urgent';
  language?: string;
}): TaskReminder {
  const currentTasks = getStoredTasks();
  const targetDate = new Date(Date.now() + params.minutesOffset * 60 * 1000);

  const newTask: TaskReminder = {
    id: Date.now().toString(),
    title: params.title.trim(),
    scheduledTime: targetDate.toISOString(),
    voiceAnnouncement:
      params.voiceAnnouncement?.trim() ||
      `Boss, it is time for your task: ${params.title.trim()}!`,
    category: params.category || 'Work',
    priority: params.priority || 'High',
    completed: false,
    notified: false,
    language: params.language || 'en-US',
  };

  const updated = [newTask, ...currentTasks];
  saveStoredTasks(updated);

  // Arm background sentinel & keep-alive immediately
  backgroundSentinel.enableBackgroundKeepAlive();
  if (backgroundSentinel.getNotificationPermission() !== 'granted') {
    backgroundSentinel.requestNotificationPermission().catch(() => {});
  }

  return newTask;
}
