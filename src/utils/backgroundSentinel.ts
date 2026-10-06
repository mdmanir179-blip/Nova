/**
 * MS AI Background & Lock-Screen Sentinel
 * Keeps reminder timers running when mobile screen is turned off or locked,
 * triggers system notifications, and plays audible alarms even on screen-off.
 */

class BackgroundSentinel {
  private isKeepAliveActive = false;
  private silentAudio: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private worker: Worker | null = null;
  private tickListeners: Array<() => void> = [];

  constructor() {
    this.initServiceWorker();
    this.initWebWorkerTicker();
    this.setupGlobalUnlockListeners();
  }

  // Setup auto-unlock on user's first touch / click
  private setupGlobalUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.enableBackgroundKeepAlive();
      // Remove once triggered
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('click', unlockHandler, { once: true });
    window.addEventListener('touchstart', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
  }

  // Initialize a Web Worker timer which does not throttle as heavily on screen lock
  private initWebWorkerTicker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    try {
      const workerBlob = new Blob(
        [
          `
          let timer = null;
          self.onmessage = function(e) {
            if (e.data === 'start') {
              if (!timer) {
                timer = setInterval(function() {
                  self.postMessage('tick');
                }, 1000);
              }
            } else if (e.data === 'stop') {
              if (timer) {
                clearInterval(timer);
                timer = null;
              }
            }
          };
          self.postMessage('ready');
        `,
        ],
        { type: 'application/javascript' }
      );

      const workerUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.notifyTick();
        }
      };

      this.worker.postMessage('start');
    } catch (err) {
      console.warn('Web Worker ticker initialization failed, fallback to setInterval:', err);
    }
  }

  // Subscribe to background ticks
  addTickListener(cb: () => void): () => void {
    this.tickListeners.push(cb);
    return () => {
      this.tickListeners = this.tickListeners.filter((l) => l !== cb);
    };
  }

  private notifyTick() {
    for (const listener of this.tickListeners) {
      try {
        listener();
      } catch (err) {
        console.warn('Error in tick listener:', err);
      }
    }
  }

  // Register service worker for lock screen notifications
  async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('Service worker registration failed:', err);
      return null;
    }
  }

  // Request system notification permission for lock-screen alerts
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch {
      return 'denied';
    }
  }

  getNotificationPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Activate Background Audio Keep-Alive Channel
  // (Prevents iOS Safari & Android Chrome from freezing JS execution when screen turns off)
  enableBackgroundKeepAlive() {
    if (typeof window === 'undefined') return;

    try {
      if (!this.silentAudio) {
        // 1-second silent WAV base64 loop
        const silentWavBase64 =
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/wD/';
        const audio = new Audio(silentWavBase64);
        audio.loop = true;
        audio.volume = 0.01;

        // Configure MediaSession so mobile OS registers MS AI as active media player
        if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'MS AI Reminder Sentinel',
            artist: 'Screen-Off Protection Active',
            album: 'MS AI Executive Assistant',
            artwork: [
              { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' }
            ]
          });

          navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
          navigator.mediaSession.setActionHandler('pause', () => {});
        }

        this.silentAudio = audio;
      }

      const playPromise = this.silentAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isKeepAliveActive = true;
          })
          .catch((err) => {
            console.warn('Audio keep-alive auto-play waiting for user interaction:', err);
          });
      }
    } catch (err) {
      console.warn('Could not start background audio sentinel:', err);
    }
  }

  disableBackgroundKeepAlive() {
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
      } catch {
        // ignore
      }
    }
    this.isKeepAliveActive = false;
  }

  getIsKeepAliveActive(): boolean {
    return this.isKeepAliveActive;
  }

  // Toggle Screen Wake Lock (Keep screen light on if desired)
  async requestWakeLock(): Promise<boolean> {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return false;
    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
      return true;
    } catch {
      return false;
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
      } catch {
        // ignore
      }
    }
  }

  isWakeLockActive(): boolean {
    return !!this.wakeLock;
  }

  // Trigger System Lock Screen Notification & Vibration
  async showLockScreenAlert(title: string, body: string, tag: string = 'ms-alert') {
    // 1. Trigger mobile vibration pattern (even if phone is silent, vibrate indicates alarm)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 200, 500, 200, 800, 300, 800]);
      } catch {
        // ignore
      }
    }

    // 2. Display System Notification (lights up mobile lock screen)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (this.swRegistration && this.swRegistration.active) {
          await this.swRegistration.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag,
            vibrate: [500, 200, 500, 200, 800, 300, 800],
            requireInteraction: true,
            renotify: true,
            data: { url: '/' },
          } as any);
        } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_REMINDER_NOTIFICATION',
            title,
            body,
            tag,
            vibration: [500, 200, 500, 200, 800, 300, 800]
          });
        } else {
          new Notification(title, {
            body,
            icon: '/favicon.svg',
            tag,
            requireInteraction: true,
          } as any);
        }
      } catch (err) {
        console.warn('System notification trigger error:', err);
      }
    }
  }
}

export const backgroundSentinel = new BackgroundSentinel();
