interface FuseLayerProfile {
  type: BiquadFilterType;
  f1: number;
  f2: number;
  q: number;
  peak: number;
  pops: number;
  popPeak: number;
  pulse: number;
}

interface NoiseBurstParams {
  start: number;
  duration: number;
  peak: number;
  filterType: BiquadFilterType;
  freqStart: number;
  freqEnd?: number;
  q?: number;
  pan?: number;
  attack?: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private effectsGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private rainNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private enabled: boolean = true;
  private masterVolume: number = 0.75;
  private effectsVolume: number = 0.9;
  private ambientVolume: number = 0.85;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // master bus -> compressor -> destination (prevents clipping / stacking)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -8;
      this.compressor.knee.value = 6;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // sub-buses
      this.effectsGain = this.ctx.createGain();
      this.effectsGain.gain.value = this.effectsVolume;
      this.effectsGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.ambientVolume;
      this.ambientGain.connect(this.masterGain);

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

  // --- helpers -------------------------------------------------------------

  private clamp01(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

  private createPanner(pan: number): StereoPannerNode | null {
    if (!this.ctx) return null;
    try {
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        return panner;
      }
    } catch {
      // StereoPannerNode unavailable - fall back to no panning
    }
    return null;
  }

  private connectEffects(node: AudioNode, pan: number) {
    const effectsGain = this.effectsGain;
    if (!effectsGain) return;
    const panner = this.createPanner(pan);
    if (panner) {
      node.connect(panner);
      panner.connect(effectsGain);
    } else {
      node.connect(effectsGain);
    }
  }

  private distancePan(distance: number): number {
    return Math.max(-1, Math.min(1, (distance % 2) - 1)) * 0.4;
  }

  private scheduleCleanup(source: AudioScheduledSourceNode, ...nodes: AudioNode[]) {
    source.onended = () => {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }

  private noiseBurst(params: NoiseBurstParams): void {
    const ctx = this.ctx;
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    try {
      const start = params.start;
      const duration = Math.max(0.008, params.duration);
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = params.filterType;
      filter.frequency.setValueAtTime(Math.max(10, params.freqStart), start);
      if (params.freqEnd !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(10, params.freqEnd), start + duration);
      }
      filter.Q.value = params.q ?? 1;

      const gain = ctx.createGain();
      const attack = params.attack ?? 0.004;
      const peak = Math.min(0.5, Math.max(0.0002, params.peak));
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0004, start + duration);

      source.connect(filter);
      filter.connect(gain);
      this.connectEffects(gain, params.pan ?? 0);
      source.start(start, Math.random() * 1.5);
      source.stop(start + duration + 0.02);
      this.scheduleCleanup(source, filter, gain);
    } catch {
      // ignore
    }
  }

  // --- volume control ------------------------------------------------------

  public setVolumes(enabled: boolean, master: number, effects: number, ambient: number) {
    this.enabled = enabled;
    this.masterVolume = this.clamp01(master);
    this.effectsVolume = this.clamp01(effects);
    this.ambientVolume = this.clamp01(ambient);

    if (this.ctx) {
      const t = this.ctx.currentTime;
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(this.enabled ? this.masterVolume : 0, t, 0.04);
      }
      if (this.effectsGain) {
        this.effectsGain.gain.setTargetAtTime(this.effectsVolume, t, 0.04);
      }
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(this.ambientVolume, t, 0.04);
      }
    }

    if (!this.enabled) {
      this.stopRainAmbience();
    }
  }

  public setSettings(enabled: boolean, volume: number) {
    this.setVolumes(enabled, volume, this.effectsVolume, this.ambientVolume);
  }

  public getDistanceGain(distance: number): number {
    const d = Math.max(0, distance);
    const raw = 1 / (1 + Math.max(0, d - 4) * 0.35);
    return Math.max(0.05, Math.min(1, raw));
  }

  // --- ambience ------------------------------------------------------------

  public updateRainAmbience(active: boolean) {
    if (!active || !this.enabled) {
      this.stopRainAmbience();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.ambientGain || !this.noiseBuffer) return;
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
      gain.connect(this.ambientGain);
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
      this.rainNode.gain.disconnect();
    } catch {
      // Ignore
    }
    this.rainNode = null;
  }

  // --- legacy one-shots (routed through the effects bus) -------------------

  public playUIClick() {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055);
      osc.connect(gain);
      this.connectEffects(gain, 0);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
      this.scheduleCleanup(osc, gain);
    } catch {}
  }

  public playPlaceCracker() {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      this.connectEffects(gain, 0);
      osc.start();
      osc.stop(ctx.currentTime + 0.095);
      this.scheduleCleanup(osc, gain);
    } catch {}
  }

  public playFuseIgnite(durationSec: number = 1.4) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
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
      this.connectEffects(gain, this.distancePan(0));
      source.start();
      source.stop(ctx.currentTime + durationSec);
      this.scheduleCleanup(source, filter, gain);
    } catch {}
  }

  public playSparkleFountain(durationSec: number = 5.0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
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
      this.connectEffects(gain, this.distancePan(0));
      source.start();
      source.stop(ctx.currentTime + durationSec);
      this.scheduleCleanup(source, filter, gain);
    } catch {}
  }

  public playChakriSpin(durationSec: number = 5.5) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
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
      this.connectEffects(gain, this.distancePan(0));
      source.start();
      source.stop(ctx.currentTime + durationSec);
      this.scheduleCleanup(source, filter, gain);
    } catch {}
  }

  public playRocketLaunch() {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
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
      this.connectEffects(oscGain, this.distancePan(0));
      osc.start(now);
      osc.stop(now + 1.12);
      this.scheduleCleanup(osc, oscGain);

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
      this.connectEffects(nGain, this.distancePan(0));
      source.start(now);
      source.stop(now + 1.12);
      this.scheduleCleanup(source, filter, nGain);
    } catch {}
  }

  public playAerialExplosion(intensity: number = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    try {
      const now = ctx.currentTime;

      // Sub-bass mortar punch
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(125, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.55);
      subGain.gain.setValueAtTime(Math.min(0.5, 0.48 * intensity), now);
      subGain.gain.exponentialRampToValueAtTime(0.002, now + 0.6);
      subOsc.connect(subGain);
      this.connectEffects(subGain, this.distancePan(0));
      subOsc.start(now);
      subOsc.stop(now + 0.62);
      this.scheduleCleanup(subOsc, subGain);

      // Explosion broadband noise burst
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(240, now + 1.3);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(Math.min(0.5, 0.45 * intensity), now);
      nGain.gain.exponentialRampToValueAtTime(0.005, now + 1.35);

      source.connect(filter);
      filter.connect(nGain);
      this.connectEffects(nGain, this.distancePan(0));
      source.start(now);
      source.stop(now + 1.4);
      this.scheduleCleanup(source, filter, nGain);
    } catch {}
  }

  public playGarlandPop() {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    try {
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200 + Math.random() * 1400;
      filter.Q.value = 1.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

      source.connect(filter);
      filter.connect(gain);
      this.connectEffects(gain, 0);
      source.start(now);
      source.stop(now + 0.15);
      this.scheduleCleanup(source, filter, gain);
    } catch {}
  }

  // --- layered sounds ------------------------------------------------------

  public playFuse(
    kind: 'sparkler' | 'wick' | 'fountain' | 'spinner' | 'loud',
    durationSec: number,
    distance: number = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    const dur = Math.max(0.4, Math.min(12, durationSec));
    const now = ctx.currentTime;
    const distGain = this.getDistanceGain(distance);
    const pan = this.distancePan(distance);

    const profiles: Record<'sparkler' | 'wick' | 'fountain' | 'spinner' | 'loud', FuseLayerProfile> = {
      sparkler: { type: 'highpass', f1: 4200, f2: 6800, q: 0.8, peak: 0.14, pops: 9, popPeak: 0.045, pulse: 0 },
      wick: { type: 'bandpass', f1: 1500, f2: 2100, q: 0.6, peak: 0.09, pops: 2, popPeak: 0.025, pulse: 0 },
      fountain: { type: 'bandpass', f1: 2400, f2: 3600, q: 1.0, peak: 0.12, pops: 7, popPeak: 0.045, pulse: 0 },
      spinner: { type: 'bandpass', f1: 900, f2: 2800, q: 2.0, peak: 0.12, pops: 4, popPeak: 0.035, pulse: 9 },
      loud: { type: 'bandpass', f1: 1800, f2: 2600, q: 1.2, peak: 0.2, pops: 15, popPeak: 0.08, pulse: 0 },
    };
    const profile = profiles[kind];

    try {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = profile.type;
      filter.frequency.setValueAtTime(profile.f1 * (0.95 + Math.random() * 0.1), now);
      filter.frequency.linearRampToValueAtTime(profile.f2, now + dur);
      filter.Q.value = profile.q;

      const gain = ctx.createGain();
      const peak = profile.peak * distGain * (0.9 + Math.random() * 0.2);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.1);
      gain.gain.setValueAtTime(peak, now + Math.max(0.15, dur - 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

      source.connect(filter);
      filter.connect(gain);
      this.connectEffects(gain, pan);
      source.start(now);
      source.stop(now + dur + 0.02);

      const extra: AudioNode[] = [filter, gain];
      if (profile.pulse > 0) {
        // pulsing amplitude for spinner character
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = profile.pulse;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = peak * 0.55;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start(now);
        lfo.stop(now + dur + 0.02);
        extra.push(lfo, lfoGain);
      }
      this.scheduleCleanup(source, ...extra);

      // occasional tiny spark pops
      for (let i = 0; i < profile.pops; i++) {
        const t = now + 0.1 + Math.random() * Math.max(0.1, dur - 0.2);
        this.noiseBurst({
          start: t,
          duration: 0.02 + Math.random() * 0.03,
          peak: profile.popPeak * distGain * (0.6 + Math.random() * 0.6),
          filterType: 'bandpass',
          freqStart: 3000 + Math.random() * 3000,
          q: 3,
          pan: Math.max(-1, Math.min(1, pan + (Math.random() * 0.6 - 0.3))),
          attack: 0.002,
        });
      }
    } catch {}
  }

  public playActiveBed(
    kind: 'sparkler' | 'fountain' | 'spinner',
    durationSec: number,
    distance: number = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    const dur = Math.max(0.6, Math.min(20, durationSec));
    const now = ctx.currentTime;
    const distGain = this.getDistanceGain(distance);
    const pan = this.distancePan(distance);

    try {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      const extra: AudioNode[] = [filter, gain];

      const fadeIn = 0.25;
      const fadeOut = Math.min(1.2, dur * 0.4);
      let peak = 0.13;

      if (kind === 'sparkler') {
        filter.type = 'highpass';
        filter.frequency.value = 5200;
        filter.Q.value = 0.7;
        peak = 0.13;
      } else if (kind === 'fountain') {
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 0.9;
        peak = 0.15;
        // gentle shimmer
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 420;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start(now);
        lfo.stop(now + dur + 0.05);
        extra.push(lfo, lfoGain);
      } else {
        // spinner whirl: band-pass frequency sweep
        filter.type = 'bandpass';
        filter.Q.value = 3.0;
        filter.frequency.setValueAtTime(700, now);
        filter.frequency.exponentialRampToValueAtTime(2600, now + dur * 0.5);
        filter.frequency.exponentialRampToValueAtTime(700, now + dur);
        peak = 0.14;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 12;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = peak * 0.35;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start(now);
        lfo.stop(now + dur + 0.05);
        extra.push(lfo, lfoGain);
      }

      const p = peak * distGain * (0.9 + Math.random() * 0.2);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p, now + fadeIn);
      gain.gain.setValueAtTime(p, now + Math.max(fadeIn + 0.05, dur - fadeOut));
      gain.gain.exponentialRampToValueAtTime(0.0005, now + dur);

      source.connect(filter);
      filter.connect(gain);
      this.connectEffects(gain, pan);
      source.start(now);
      source.stop(now + dur + 0.02);
      this.scheduleCleanup(source, ...extra);
    } catch {}
  }

  public playLaunch(kind: 'rocket' | 'shell' | 'kuruvi', distance: number = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const distGain = this.getDistanceGain(distance);
    const pan = this.distancePan(distance);

    try {
      if (kind === 'rocket') {
        // rising whistle
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520 * (0.96 + Math.random() * 0.08), now);
        osc.frequency.exponentialRampToValueAtTime(2150, now + 1.05);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.01, now);
        oscGain.gain.linearRampToValueAtTime(0.12 * distGain, now + 0.15);
        oscGain.gain.exponentialRampToValueAtTime(0.002, now + 1.1);
        osc.connect(oscGain);
        this.connectEffects(oscGain, pan);
        osc.start(now);
        osc.stop(now + 1.12);
        this.scheduleCleanup(osc, oscGain);

        // thrust noise
        this.noiseBurst({
          start: now,
          duration: 1.1,
          peak: 0.24 * distGain,
          filterType: 'bandpass',
          freqStart: 800,
          freqEnd: 2400,
          q: 1,
          pan,
          attack: 0.02,
        });
      } else if (kind === 'shell') {
        // short low thump
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
        const g = ctx.createGain();
        g.gain.setValueAtTime(Math.min(0.5, 0.4 * distGain), now);
        g.gain.exponentialRampToValueAtTime(0.002, now + 0.26);
        osc.connect(g);
        this.connectEffects(g, pan);
        osc.start(now);
        osc.stop(now + 0.28);
        this.scheduleCleanup(osc, g);

        this.noiseBurst({
          start: now,
          duration: 0.22,
          peak: 0.22 * distGain,
          filterType: 'lowpass',
          freqStart: 700,
          freqEnd: 160,
          q: 0.8,
          pan,
          attack: 0.005,
        });
      } else {
        // kuruvi: rapid high whistle flutter (a few short chirps)
        const chirps = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < chirps; i++) {
          const t = now + i * (0.07 + Math.random() * 0.04);
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const base = 2400 + Math.random() * 900;
          osc.frequency.setValueAtTime(base, t);
          osc.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.05);
          osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.09 * distGain, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.connect(g);
          this.connectEffects(g, pan);
          osc.start(t);
          osc.stop(t + 0.11);
          this.scheduleCleanup(osc, g);
        }
      }
    } catch {}
  }

  public playBurst(
    kind: 'crack' | 'bang' | 'thunder' | 'pop' | 'whistle',
    opts?: { distance?: number; gain?: number; pitch?: number; intensity?: number }
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    const distance = opts?.distance ?? 0;
    const pitch = (opts?.pitch ?? 1) * (0.96 + Math.random() * 0.08);
    const amp =
      this.getDistanceGain(distance) * (opts?.gain ?? 1) * Math.max(0.2, Math.min(2, opts?.intensity ?? 1));
    const pan = this.distancePan(distance);
    const now = ctx.currentTime;
    const pk = (v: number) => Math.min(0.5, Math.max(0.0002, v * amp));

    try {
      if (kind === 'crack') {
        // sharp mid-band noise burst plus a tiny click
        this.noiseBurst({
          start: now,
          duration: 0.08,
          peak: pk(0.42),
          filterType: 'bandpass',
          freqStart: 2600 * pitch,
          freqEnd: 900 * pitch,
          q: 1.4,
          pan,
          attack: 0.001,
        });
        this.noiseBurst({
          start: now,
          duration: 0.012,
          peak: pk(0.16),
          filterType: 'highpass',
          freqStart: 3200,
          q: 0.7,
          pan,
          attack: 0.001,
        });
      } else if (kind === 'bang') {
        // short sub sine drop plus filtered noise
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(pk(0.4), now);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.34);
        osc.connect(g);
        this.connectEffects(g, pan);
        osc.start(now);
        osc.stop(now + 0.36);
        this.scheduleCleanup(osc, g);

        this.noiseBurst({
          start: now,
          duration: 0.4,
          peak: pk(0.3),
          filterType: 'lowpass',
          freqStart: 1300,
          freqEnd: 220,
          q: 0.9,
          pan,
          attack: 0.004,
        });
      } else if (kind === 'thunder') {
        // deeper sub plus a longer low-decay tail
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(24, now + 0.85);
        const g = ctx.createGain();
        g.gain.setValueAtTime(pk(0.48), now);
        g.gain.exponentialRampToValueAtTime(0.0005, now + 0.95);
        osc.connect(g);
        this.connectEffects(g, pan);
        osc.start(now);
        osc.stop(now + 0.98);
        this.scheduleCleanup(osc, g);

        this.noiseBurst({
          start: now,
          duration: 1.7,
          peak: pk(0.32),
          filterType: 'lowpass',
          freqStart: 900,
          freqEnd: 120,
          q: 0.7,
          pan,
          attack: 0.01,
        });
        this.playEcho(Math.max(0.4, opts?.intensity ?? 1), distance);
      } else if (kind === 'pop') {
        // very short band-passed blip
        this.noiseBurst({
          start: now,
          duration: 0.045,
          peak: pk(0.36),
          filterType: 'bandpass',
          freqStart: (1500 + Math.random() * 600) * pitch,
          q: 6,
          pan,
          attack: 0.001,
        });
      } else {
        // whistle: pitch-swept sine
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(2600 * pitch, now + 0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(pk(0.3), now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(g);
        this.connectEffects(g, pan);
        osc.start(now);
        osc.stop(now + 0.58);
        this.scheduleCleanup(osc, g);
      }
    } catch {}
  }

  public playEcho(intensity: number, distance: number = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const distGain = this.getDistanceGain(distance);
    const pan = this.distancePan(distance);
    const amt = Math.max(0, Math.min(2, intensity));

    try {
      // diffuse tail via delay feedback
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 480 + Math.random() * 220;
      filter.Q.value = 0.5;

      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.18 + Math.random() * 0.12;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.42;

      const wet = ctx.createGain();
      wet.gain.setValueAtTime(0.0001, now);
      wet.gain.linearRampToValueAtTime(Math.min(0.4, 0.18 * amt * distGain), now + 0.03);
      wet.gain.exponentialRampToValueAtTime(0.0005, now + 1.6);

      source.connect(filter);
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      this.connectEffects(wet, pan);

      source.start(now);
      source.stop(now + 1.7);
      this.scheduleCleanup(source, filter, delay, feedback, wet);
    } catch {}
  }

  public playPaperDebris(count: number = 5, distance: number = 0) {
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsGain || !this.noiseBuffer) return;
    const n = Math.max(1, Math.min(12, count));
    const now = ctx.currentTime;
    const distGain = this.getDistanceGain(distance);

    try {
      for (let i = 0; i < n; i++) {
        const t = now + 0.02 + Math.random() * 0.9;
        this.noiseBurst({
          start: t,
          duration: 0.03 + Math.random() * 0.04,
          peak: 0.05 * distGain * (0.6 + Math.random() * 0.5),
          filterType: 'highpass',
          freqStart: 2600 + Math.random() * 2400,
          q: 0.8,
          pan: Math.random() * 2 - 1,
          attack: 0.002,
        });
      }
    } catch {}
  }

  // --- generic dispatcher --------------------------------------------------

  public playAt(kind: string, opts?: { distance?: number; gain?: number; pitch?: number }) {
    const distance = opts?.distance ?? 0;
    const gain = opts?.gain ?? 1;
    // slight random pitch variation per call
    const pitch = (opts?.pitch ?? 1) * (0.94 + Math.random() * 0.12);

    try {
      switch (kind) {
        case 'crack':
        case 'bang':
        case 'thunder':
        case 'pop':
        case 'whistle':
          this.playBurst(kind, { distance, gain, pitch });
          break;
        case 'echo':
          this.playEcho(gain, distance);
          break;
        case 'paper':
        case 'debris':
          this.playPaperDebris(undefined, distance);
          break;
        case 'rocket':
        case 'shell':
        case 'kuruvi':
          this.playLaunch(kind, distance);
          break;
        case 'sparkler':
        case 'fountain':
        case 'spinner':
          this.playActiveBed(kind, 3, distance);
          break;
        case 'wick':
        case 'loud':
          this.playFuse(kind, 1.6, distance);
          break;
        case 'fuse-sparkler':
          this.playFuse('sparkler', 1.6, distance);
          break;
        case 'fuse-fountain':
          this.playFuse('fountain', 2.5, distance);
          break;
        case 'fuse-spinner':
          this.playFuse('spinner', 2.5, distance);
          break;
        case 'ui-click':
          this.playUIClick();
          break;
        case 'place-cracker':
          this.playPlaceCracker();
          break;
        case 'fuse-ignite':
          this.playFuseIgnite();
          break;
        case 'sparkle-fountain':
          this.playSparkleFountain();
          break;
        case 'chakri-spin':
          this.playChakriSpin();
          break;
        case 'rocket-launch':
          this.playRocketLaunch();
          break;
        case 'aerial-explosion':
          this.playAerialExplosion(gain);
          break;
        case 'garland-pop':
          this.playGarlandPop();
          break;
        default:
          break;
      }
    } catch {
      // ignore
    }
  }
}

export const audioSystem = new SoundEngine();
