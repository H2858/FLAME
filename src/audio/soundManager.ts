/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Master-Grade Procedural Audio Engine for Ignis Azure.
 * Features multi-layered FM synthesis, sub-bass punch, dynamic compressor mastering,
 * crystal harmonic overtones, ethereal ambient drones, and distant wolf howls.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMusicPlaying = false;

  private masterVol = 0.8;
  private sfxVol = 0.85;
  private musicVol = 0.55;
  private vibrationEnabled = true;
  private rainAudio: HTMLAudioElement | null = null;
  private characterFlightAudio: HTMLAudioElement | null = null;

  constructor() {}

  /** Play the supplied studio WAV assets; synthesized effects remain a fallback. */
  private playAsset(file: string, volume = 1): boolean {
    try {
      const audio = new Audio(`/audio/${file}`);
      audio.preload = 'auto';
      audio.volume = Math.max(0, Math.min(1, this.masterVol * this.sfxVol * volume));
      void audio.play().catch(() => {});
      return true;
    } catch { return false; }
  }

  public startRainLoop() {
    try {
      if (!this.rainAudio) {
        this.rainAudio = new Audio('/audio/rain-loop.wav');
        this.rainAudio.loop = true;
        this.rainAudio.preload = 'auto';
        this.rainAudio.volume = Math.min(1, this.masterVol * this.sfxVol * 0.32);
      }
      if (this.rainAudio.paused) void this.rainAudio.play().catch(() => {});
    } catch { /* audio is optional */ }
  }

  public stopRainLoop() {
    if (!this.rainAudio || this.rainAudio.paused) return;
    this.rainAudio.pause();
    this.rainAudio.currentTime = 0;
  }

  public playBossArrival() {
    if (!this.playAsset('boss-arrival.wav', 0.9)) this.playNova();
  }

  public playFamilyArrival() {
    if (!this.playAsset('family-reunion.wav', 0.95)) this.playFamilyRevealChime();
  }

  /** Character-only flight sound. The city aircraft intentionally has no link to this audio. */
  public startCharacterFlight() {
    try {
      if (!this.characterFlightAudio) {
        this.characterFlightAudio = new Audio('/audio/character-flight.wav');
        this.characterFlightAudio.preload = 'auto';
        this.characterFlightAudio.loop = true;
      }
      this.characterFlightAudio.volume = Math.max(0, Math.min(1, this.masterVol * this.sfxVol * 0.42));
      if (this.characterFlightAudio.paused) {
        this.characterFlightAudio.currentTime = 0;
        void this.characterFlightAudio.play().catch(() => {});
      }
    } catch { /* audio is optional */ }
  }

  public stopCharacterFlight() {
    if (!this.characterFlightAudio || this.characterFlightAudio.paused) return;
    this.characterFlightAudio.pause();
    this.characterFlightAudio.currentTime = 0;
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Studio Mastering Dynamics Compressor (prevents clipping, gives cinematic punch)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVol, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Background drone noise removed per user request - only clean sound effects!
    } catch {
      // AudioContext lazy init
    }
  }

  public setVolumes(master: number, sfx: number, music: number) {
    this.masterVol = master;
    this.sfxVol = sfx;
    this.musicVol = music;

    if (this.ctx && this.masterGain && this.sfxGain && this.musicGain) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(master, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(sfx, t, 0.05);
      this.musicGain.gain.setTargetAtTime(music, t, 0.05);
    }
  }

  public setVibration(enabled: boolean) {
    this.vibrationEnabled = enabled;
  }

  public triggerHaptics(pattern: number | number[]) {
    if (!this.vibrationEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }

  // ==========================================
  // TOKEN & SPECIAL EVENT SFX (NO BACKGROUND NOISE)
  // ==========================================

  public startAmbientMusic() {
    // Disabled: pure silence in background, crystal-clear SFX only!
  }

  /**
   * Sound when collecting the Horizontal Flight Token (Rocket Flame)
   */
  public playFlightTokenPickup() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([40, 30, 70]);

    try {
      const t = this.ctx.currentTime;
      const notes = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6 soaring chord
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = t + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.24, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });

      this.playShapedNoise(0.22, 2400, 0.2);
    } catch {
      // ignore
    }
  }

  /**
   * Sound when collecting the Stamina / Vitality Token
   */
  public playStaminaTokenPickup() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([30, 40]);

    try {
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 1046.5]; // C5, E5, C6 vitality chime
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = t + idx * 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.26, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.45);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Subtle whoosh when a celestial meteor / shooting star streaks across the sky
   */
  public playMeteorStreak() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.38);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.setValueAtTime(2.0, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.4);
    } catch {
      // ignore
    }
  }

  public stopAmbientMusic() {
    if (!this.isMusicPlaying) return;
    try {
      if (this.ambientGain && this.ctx) {
        this.ambientGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1);
        setTimeout(() => {
          this.ambientOsc1?.stop();
          this.ambientOsc2?.stop();
          this.ambientOsc1?.disconnect();
          this.ambientOsc2?.disconnect();
          this.isMusicPlaying = false;
        }, 1100);
      }
    } catch {
      this.isMusicPlaying = false;
    }
  }

  /**
   * Cinematic distant wolf howl synthesized smoothly when wolf eyes awaken in the dark.
   */
  public playDistantWolfHowl() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      // Typical lupine howl: starts mid (340Hz), swells up to 520Hz, gently bends down to 260Hz
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(540, t + 0.8);
      osc.frequency.exponentialRampToValueAtTime(240, t + 2.4);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, t);
      filter.Q.setValueAtTime(3.2, t);

      // Distant and atmospheric, low volume with soft swell
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 2.6);
    } catch {
      // ignore
    }
  }

  /** Legacy alias retained for callers: start the character's flight audio. */
  public playFlyThrust() {
    this.startCharacterFlight();
  }

  /**
   * Holy sacred harp chime when the family is revealed at the end of the road
   */
  public playFamilyRevealChime() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const freqs = [659.25, 783.99, 987.77, 1318.51]; // E major chord
      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const t = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.6);
      });
    } catch {
      // ignore
    }
  }

  /** Short steel-on-scabbard rasp, layered with a bright blade ring. */
  public playKatanaDraw() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.24), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.setValueAtTime(3100, t); filter.Q.value = 0.8;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t); gain.gain.linearRampToValueAtTime(0.17, t + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      noise.connect(filter); filter.connect(gain); gain.connect(this.sfxGain); noise.start(t);
      const ring = this.ctx.createOscillator(); const ringGain = this.ctx.createGain();
      ring.type = 'sine'; ring.frequency.setValueAtTime(1450, t + 0.04);
      ring.frequency.exponentialRampToValueAtTime(720, t + 0.28);
      ringGain.gain.setValueAtTime(0.07, t + 0.04); ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      ring.connect(ringGain); ringGain.connect(this.sfxGain); ring.start(t + 0.04); ring.stop(t + 0.31);
    } catch { /* audio is optional */ }
  }

  /** Distant, restrained raven call for the moonlit atmosphere. */
  public playCrowCall() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      [0, 0.19].forEach((offset, i) => {
        const osc = this.ctx!.createOscillator(); const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(i === 0 ? 620 : 510, t + offset);
        osc.frequency.exponentialRampToValueAtTime(i === 0 ? 390 : 330, t + offset + 0.28);
        filter.type = 'lowpass'; filter.frequency.value = 1150;
        gain.gain.setValueAtTime(0.001, t + offset);
        gain.gain.linearRampToValueAtTime(0.045, t + offset + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.31);
        osc.connect(filter); filter.connect(gain); gain.connect(this.sfxGain!);
        osc.start(t + offset); osc.stop(t + offset + 0.32);
      });
    } catch { /* audio is optional */ }
  }

  /**
   * Crisp Katana / Azure Blade Slashes with FM body and air whoosh.
   */
  public playSlash(comboIndex = 0) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics(comboIndex === 2 ? [30, 25, 45] : 14);
    if (this.playAsset('sword-impact.wav', comboIndex === 2 ? 1 : 0.78)) return;
    if (comboIndex === 0) this.playKatanaDraw();

    try {
      const t = this.ctx.currentTime;
      const isHeavy = comboIndex === 2;

      // Layer 1: High speed frequency-swept blade tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const startFreq = isHeavy ? 920 : 640 + comboIndex * 120;
      const endFreq = isHeavy ? 75 : 120;
      const dur = isHeavy ? 0.22 : 0.13;

      osc.type = isHeavy ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isHeavy ? 1200 : 1800, t);
      filter.Q.setValueAtTime(2.5, t);

      gain.gain.setValueAtTime(isHeavy ? 0.42 : 0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + dur);

      // Layer 2: Sculpted blade whoosh noise burst
      this.playShapedNoise(dur, isHeavy ? 1600 : 2800, isHeavy ? 0.24 : 0.16);

      // Heavy slash sub-thump
      if (isHeavy) {
        this.playSubDrop(140, 38, 0.18, 0.35);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Celestial Beam: Heavy resonant energy railgun sound.
   */
  public playCelestialBeam() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([40, 20, 50, 20, 70]);

    try {
      const t = this.ctx.currentTime;
      const dur = 0.55;

      // Dual detuned saw waves for thick plasma sound
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(240, t);
      osc1.frequency.exponentialRampToValueAtTime(980, t + dur * 0.4);
      osc1.frequency.exponentialRampToValueAtTime(160, t + dur);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(247, t);
      osc2.frequency.exponentialRampToValueAtTime(1010, t + dur * 0.4);
      osc2.frequency.exponentialRampToValueAtTime(165, t + dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(3400, t + 0.15);
      filter.frequency.exponentialRampToValueAtTime(800, t + dur);
      filter.Q.setValueAtTime(4.0, t);

      gain.gain.setValueAtTime(0.38, t);
      gain.gain.linearRampToValueAtTime(0.48, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur);
      osc2.stop(t + dur);

      this.playShapedNoise(dur, 3200, 0.22);
      this.playSubDrop(190, 42, 0.35, 0.38);
    } catch {
      // ignore
    }
  }

  /**
   * Crystal Parry Bell (Sekiro / Elden Ring harmonic chime).
   */
  public playParrySuccess() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([60, 30, 80]);

    try {
      const t = this.ctx.currentTime;
      // 3 pure crystal harmonic frequencies: C6, E6, G6
      const freqs = [1046.5, 1318.5, 1567.98, 2093.0];
      freqs.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const decay = 0.45 + idx * 0.1;
        gain.gain.setValueAtTime(0.25 / (idx + 1), t);
        gain.gain.exponentialRampToValueAtTime(0.0005, t + decay);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + decay);
      });

      // Quick metallic spark snap
      this.playShapedNoise(0.06, 5000, 0.28);
    } catch {
      // ignore
    }
  }

  /**
   * Quick flame burst / ignite.
   */
  /** Distant cinematic thunder roll for storm stages. */
  public playThunder() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t = this.ctx.currentTime;
      const rumble = this.ctx.createOscillator();
      const rumbleGain = this.ctx.createGain();
      rumble.type = 'sine';
      rumble.frequency.setValueAtTime(74, t);
      rumble.frequency.exponentialRampToValueAtTime(34, t + 1.25);
      rumbleGain.gain.setValueAtTime(0.0001, t);
      rumbleGain.gain.linearRampToValueAtTime(0.16, t + 0.08);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
      rumble.connect(rumbleGain);
      rumbleGain.connect(this.sfxGain);
      rumble.start(t);
      rumble.stop(t + 1.5);
      this.playShapedNoise(0.85, 260, 0.12);
    } catch {
      // Audio is optional; visual lightning remains available if WebAudio is restricted.
    }
  }

  public playBlast() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics(20);

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.2);

      this.playShapedNoise(0.18, 1800, 0.2);
    } catch {
      // ignore
    }
  }

  /**
   * Deep cinematic explosion with sub drop and crumbling roar.
   */
  public playBlastExplosion() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([40, 30, 60]);

    try {
      this.playSubDrop(160, 30, 0.45, 0.55);
      this.playShapedNoise(0.42, 900, 0.38);
    } catch {
      // ignore
    }
  }

  /**
   * Aerodynamic Phantom Flame Dash.
   */
  public playDash() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics(18);

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(1.8, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.18);

      this.playShapedNoise(0.2, 2800, 0.22);
    } catch {
      // ignore
    }
  }

  /**
   * Supernova: Massive crescendo, vacuum drop, and earth-shattering blast.
   */
  public playNova() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([40, 30, 80, 40, 120]);

    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(95, t);
      osc1.frequency.exponentialRampToValueAtTime(740, t + 0.45);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(190, t);
      osc2.frequency.exponentialRampToValueAtTime(1120, t + 0.45);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.8);
      osc2.stop(t + 0.8);

      setTimeout(() => {
        this.playBlastExplosion();
      }, 420);
    } catch {
      // ignore
    }
  }

  /**
   * Heavy meaty impact sound with sub-punch.
   */
  public playHitImpact() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics(22);

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.1);

      this.playShapedNoise(0.06, 1100, 0.22);
    } catch {
      // ignore
    }
  }

  /**
   * Sparkling soul mote pickup chime.
   */
  public playSoulPickup() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.05); // E6

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch {
      // ignore
    }
  }

  /**
   * Enemy disintegration hiss and thud.
   */
  public playEnemyDeath() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    try {
      this.playSubDrop(150, 32, 0.22, 0.3);
      this.playShapedNoise(0.24, 750, 0.25);
    } catch {
      // ignore
    }
  }

  /**
   * Majestic Pentatonic Victory Fanfare when meeting family or completing level.
   */
  public playVictory() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([40, 40, 40, 40, 80]);

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C major pentatonic
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const t = this.ctx.currentTime + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.26, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.42);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Solemn Game Over resonance.
   */
  public playGameOver() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.triggerHaptics([80, 100, 160]);

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.95);

      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.95);
    } catch {
      // ignore
    }
  }

  // ==========================================
  // SYNTHESIS UTILITIES
  // ==========================================

  private playSubDrop(startFreq: number, endFreq: number, duration: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  private playShapedNoise(duration: number, cutoff: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      whiteNoise.start();
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
