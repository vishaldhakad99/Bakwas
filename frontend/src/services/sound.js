class SoundService {
  constructor() {
    this.ctx = null;
    this.ringInterval = null;
    this.isRinging = false;
  }

  getAudioContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Incoming call ringtone
  playIncomingRing() {
    if (this.isRinging) return;
    this.isRinging = true;

    const ring = () => {
      const ctx = this.getAudioContext();
      if (!ctx || !this.isRinging) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc2.frequency.setValueAtTime(480, now); // B4

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.8);
      gain.gain.linearRampToValueAtTime(0, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    };

    ring();
    this.ringInterval = setInterval(() => {
      if (this.isRinging) ring();
    }, 2400);
  }

  // Outgoing call ringing
  playOutgoingRing() {
    if (this.isRinging) return;
    this.isRinging = true;

    const ring = () => {
      const ctx = this.getAudioContext();
      if (!ctx || !this.isRinging) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + 1.2);
      gain.gain.linearRampToValueAtTime(0, now + 1.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.3);
    };

    ring();
    this.ringInterval = setInterval(() => {
      if (this.isRinging) ring();
    }, 3500);
  }

  stopRinging() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Message sent sound
  playSent() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.08);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Message received sound
  playReceived() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(800, now);
      osc2.frequency.setValueAtTime(1200, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.06);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.18);
    } catch {
      // Autoplay fallback
    }
  }
}

export const sound = new SoundService();
