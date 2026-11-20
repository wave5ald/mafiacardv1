class MafiaAudioSynth {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = window.localStorage.getItem('mafiacards_muted') === '1';
      } catch {
        this.muted = false;
      }
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(next: boolean): void {
    this.muted = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('mafiacards_muted', next ? '1' : '0');
      } catch {
        // ignore
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
    slideToFreq?: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public click(): void {
    this.playTone(540, 0.07, 'triangle', 0.07, 0, 680);
  }

  public hover(): void {
    this.playTone(420, 0.04, 'sine', 0.03, 0, 480);
  }

  public error(): void {
    this.playTone(210, 0.14, 'sawtooth', 0.06, 0, 150);
  }

  public confirm(): void {
    this.playTone(523.25, 0.09, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.08, 0.07);
  }

  public sleep(): void {
    this.playTone(392, 0.35, 'sine', 0.07, 0, 261.63);
    this.playTone(311.13, 0.45, 'sine', 0.05, 0.18, 196);
  }

  public roleWake(): void {
    this.playTone(330, 0.16, 'triangle', 0.08, 0);
    this.playTone(440, 0.18, 'triangle', 0.08, 0.1);
    this.playTone(587.33, 0.28, 'sine', 0.09, 0.2);
  }

  public cardActivate(): void {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, i) => {
      this.playTone(n, 0.22, 'triangle', 0.09, i * 0.065);
    });
  }

  public elimination(): void {
    this.playTone(174.61, 0.42, 'sawtooth', 0.08, 0, 87.3);
    this.playTone(130.81, 0.5, 'triangle', 0.09, 0.12, 73.42);
  }

  public saved(): void {
    this.playTone(523.25, 0.15, 'sine', 0.08, 0);
    this.playTone(659.25, 0.18, 'sine', 0.08, 0.11);
    this.playTone(783.99, 0.3, 'triangle', 0.09, 0.22);
  }

  public victory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, 0.32, 'triangle', 0.1, i * 0.11);
    });
  }
}

export const audioSynth = new MafiaAudioSynth();
