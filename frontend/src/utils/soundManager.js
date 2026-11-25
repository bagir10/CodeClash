/**
 * Sound Manager: Synthesizes high-energy game audio using the Web Audio API.
 * Zero external asset dependencies, zero network latency, zero CORS issues.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = typeof window !== 'undefined' && localStorage.getItem('codeclash_sound_muted') === 'true';
  }

  _initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('codeclash_sound_muted', String(this.muted));
    }
    return this.muted;
  }

  /**
   * Play a clean synthesized tone with envelope
   */
  _playTone(freq, duration, type = 'sine', gainVal = 0.15, delay = 0) {
    if (this.muted) return;
    this._initContext();
    if (!this.ctx) return;

    const startTime = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Play Test Passed: Upbeat 2-tone chime
   */
  playTestPassed() {
    this._playTone(523.25, 0.12, 'sine', 0.12, 0);     // C5
    this._playTone(659.25, 0.22, 'triangle', 0.15, 0.08); // E5
  }

  /**
   * Play Question Solved: Triumphant ascending fanfare
   */
  playQuestionSolved() {
    this._playTone(523.25, 0.12, 'triangle', 0.15, 0);    // C5
    this._playTone(659.25, 0.12, 'triangle', 0.15, 0.1);  // E5
    this._playTone(783.99, 0.15, 'triangle', 0.18, 0.2);  // G5
    this._playTone(1046.5, 0.45, 'sine', 0.22, 0.3);     // C6
  }

  /**
   * Play Countdown Warning (last 30s): Subtle wooden tick
   */
  playCountdownWarning() {
    this._playTone(880, 0.05, 'sine', 0.08, 0);
  }

  /**
   * Play Victory: Celebratory victory chords
   */
  playVictory() {
    const notes = [
      { f: 261.63, d: 0.2, t: 0 },    // C4
      { f: 329.63, d: 0.2, t: 0.1 },  // E4
      { f: 392.00, d: 0.2, t: 0.2 },  // G4
      { f: 523.25, d: 0.3, t: 0.3 },  // C5
      { f: 659.25, d: 0.3, t: 0.45 }, // E5
      { f: 783.99, d: 0.4, t: 0.6 },  // G5
      { f: 1046.5, d: 0.8, t: 0.75 }, // C6
    ];
    for (const n of notes) {
      this._playTone(n.f, n.d, 'triangle', 0.18, n.t);
    }
  }

  /**
   * Play Defeat: Low dramatic descending tone
   */
  playDefeat() {
    this._playTone(311.13, 0.25, 'sawtooth', 0.12, 0);    // Eb4
    this._playTone(261.63, 0.3, 'sawtooth', 0.12, 0.2);   // C4
    this._playTone(207.65, 0.6, 'sine', 0.15, 0.45);      // Ab3
  }
}

export const soundManager = new SoundManager();
export default soundManager;
