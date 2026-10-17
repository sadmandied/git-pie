/**
 * GitCity 3D — Procedural Cyberpunk Audio Synthesizer
 * Uses pure Web Audio API with zero external audio assets.
 */

class CityAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.lfo = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
  }

  toggle() {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stopDrone();
      this.isPlaying = false;
    } else {
      this.startDrone();
      this.isPlaying = true;
    }
    return this.isPlaying;
  }

  startDrone() {
    if (!this.ctx) return;

    // Master drone volume
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.droneGain.gain.exponentialRampToValueAtTime(0.08, this.ctx.currentTime + 3);

    // Deep sub bass oscillator (55Hz / A1)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Detuned warm oscillator (110Hz / A2)
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(110.5, this.ctx.currentTime);

    // Lowpass filter for smooth cyberpunk atmosphere
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    // LFO to slowly sweep filter
    this.lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime); // slow pulse
    lfoGain.gain.setValueAtTime(80, this.ctx.currentTime);

    this.lfo.connect(filter.frequency);
    this.droneOsc1.connect(filter);
    this.droneOsc2.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.droneOsc1.start();
    this.droneOsc2.start();
    this.lfo.start();
  }

  stopDrone() {
    if (!this.ctx || !this.droneGain) return;
    this.droneGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
    setTimeout(() => {
      try {
        if (this.droneOsc1) { this.droneOsc1.stop(); this.droneOsc1.disconnect(); }
        if (this.droneOsc2) { this.droneOsc2.stop(); this.droneOsc2.disconnect(); }
        if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); }
      } catch (e) {}
    }, 1250);
  }

  // Futuristic hologram select chirp
  playBuildingSelect() {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Laser scanner build whoosh
  playConstructPulse() {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.2);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }
}

export const cityAudio = new CityAudio();
