class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rainNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private enabled: boolean = true;
  private volume: number = 0.75;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? this.volume : 0;
      this.masterGain.connect(this.ctx.destination);
      this.createNoiseBuffer();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 2.5;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    this.noiseBuffer = buffer;
  }

  public setSettings(enabled: boolean, volume: number) {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.volume : 0,
        this.ctx.currentTime,
        0.04
      );
    }
    if (!this.enabled) {
      this.stopRainAmbience();
    }
  }

  public updateRainAmbience(active: boolean) {
    if (!active || !this.enabled) {
      this.stopRainAmbience();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    if (this.rainNode) return;

    try {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = 0.01;
      gain.gain.setTargetAtTime(0.18, ctx.currentTime, 0.4);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();

      this.rainNode = { source, gain };
    } catch {
      // Ignore audio errors
    }
  }

  public stopRainAmbience() {
    if (!this.rainNode) return;
    try {
      this.rainNode.source.stop();
      this.rainNode.source.disconnect();
    } catch {
      // Ignore
    }
    this.rainNode = null;
  }

  public playUIClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  public playPlaceCracker() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.095);
    } catch {}
  }

  public playFuseIgnite(durationSec: number = 1.4) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(4800, ctx.currentTime + durationSec);
      filter.Q.value = 2.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationSec);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      source.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  public playSparkleFountain(durationSec: number = 5.0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.22, ctx.currentTime + Math.max(0.4, durationSec - 0.8));
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + durationSec);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      source.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  public playChakriSpin(durationSec: number = 5.5) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + durationSec * 0.6);
      filter.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + durationSec);
      filter.Q.value = 3.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.26, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + durationSec);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
      source.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  public playRocketLaunch() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = ctx.currentTime;

      // Whistle pitch sweep
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(2150, now + 1.05);
      oscGain.gain.setValueAtTime(0.01, now);
      oscGain.gain.linearRampToValueAtTime(0.14, now + 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.002, now + 1.1);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.12);

      // Thrust whoosh noise
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 1.0);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.28, now);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);
      source.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      source.start(now);
      source.stop(now + 1.12);
    } catch {}
  }

  public playAerialExplosion(intensity: number = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = ctx.currentTime;

      // Sub-bass mortar punch
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(125, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.55);
      subGain.gain.setValueAtTime(0.48 * intensity, now);
      subGain.gain.exponentialRampToValueAtTime(0.002, now + 0.6);
      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.62);

      // Explosion broadband noise burst
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(240, now + 1.3);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.45 * intensity, now);
      nGain.gain.exponentialRampToValueAtTime(0.005, now + 1.35);

      source.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterGain);
      source.start(now);
      source.stop(now + 1.4);
    } catch {}
  }

  public playGarlandPop() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.noiseBuffer) return;
    try {
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 1400;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);
      source.stop(now + 0.15);
    } catch {}
  }
}

export const audioSystem = new SoundEngine();
