// AudioSystem.js - Handles all audio functionality for the game

export class AudioSystem {
  constructor() {
    this.AC = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicStarted = false;
    this.muted = false;
    this.musicTimer = null;
    this.audioBuffers = new Map(); // Store loaded audio files
  }

  ensureAudioContext() {
    if (this.AC) return;
    this.AC = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.AC.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.AC.destination);

    this.musicGain = this.AC.createGain();
    this.musicGain.gain.value = 0.05;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.AC.createGain();
    this.sfxGain.gain.value = 0.18;
    this.sfxGain.connect(this.masterGain);
  }

  // Load audio file
  async loadAudio(name, url) {
    this.ensureAudioContext();
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.AC.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);
    } catch (error) {
      console.error(`Failed to load audio: ${name}`, error);
    }
  }

  // Play loaded audio file
  playAudio(name, volume = 1, loop = false, gainNode = this.sfxGain) {
    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      console.warn(`Audio not found: ${name}`);
      return;
    }

    const source = this.AC.createBufferSource();
    const gain = this.AC.createGain();

    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(gainNode);
    source.start();

    return source; // Return for stopping if needed
  }

  async setupAudioUI() {
    await this.loadAudio('background-music', 'sounds/background-music.mp3');

    const startMusic = () => {
      this.ensureAudioContext();
      if (this.AC.state === "suspended") this.AC.resume();
      this.playAudio('background-music', 1, true, this.musicGain);
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
    };
    window.addEventListener("pointerdown", startMusic);
    window.addEventListener("keydown", startMusic);
    startMusic();
    const btn = document.getElementById("muteBtn");
    if (!btn) return;
    btn.onclick = () => {
      this.ensureAudioContext();
      this.muted = !this.muted;
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 1,
        this.AC.currentTime,
        0.05
      );
      btn.textContent = this.muted ? "🔇" : "🔊";
    };
  }

  startMusic() {
    if (this.musicStarted) return;
    this.ensureAudioContext();

    const o1 = this.AC.createOscillator();
    const o2 = this.AC.createOscillator();
    o1.type = "sine";
    o2.type = "triangle";
    o1.connect(this.musicGain);
    o2.connect(this.musicGain);
    o1.start();
    o2.start();

    let i = 0;
    const notes = [220.0, 233.08, 261.63, 293.66];
    const fifths = [330.0, 349.23, 392.0, 440.0];

    this.musicTimer = setInterval(() => {
      if (!this.AC) return;
      o1.frequency.setTargetAtTime(
        notes[i % notes.length],
        this.AC.currentTime,
        0.08
      );
      o2.frequency.setTargetAtTime(
        fifths[i % fifths.length],
        this.AC.currentTime,
        0.08
      );
      i++;
    }, 900);

    this.musicStarted = true;
  }

  sfxTone(freq, dur = 0.08, type = "triangle", vol = 1) {
    this.ensureAudioContext();
    const o = this.AC.createOscillator();
    const g = this.AC.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(this.sfxGain);
    g.gain.setValueAtTime(0.0001, this.AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.14 * vol, this.AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.AC.currentTime + dur);
    o.start();
    o.stop(this.AC.currentTime + dur);
  }

  sfxSweep(f1, f2, dur = 0.12, type = "triangle", vol = 1) {
    this.ensureAudioContext();
    const o = this.AC.createOscillator();
    const g = this.AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, this.AC.currentTime);
    o.connect(g);
    g.connect(this.sfxGain);
    g.gain.setValueAtTime(0.0001, this.AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12 * vol, this.AC.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, this.AC.currentTime + dur);
    o.start();
    o.frequency.linearRampToValueAtTime(f2, this.AC.currentTime + dur * 0.9);
    o.stop(this.AC.currentTime + dur);
  }

  sfxNoise(dur = 0.08, vol = 1, cutoff = 500) {
    this.ensureAudioContext();
    const buffer = this.AC.createBuffer(
      1,
      Math.floor(this.AC.sampleRate * dur),
      this.AC.sampleRate
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src = this.AC.createBufferSource();
    src.buffer = buffer;
    const flt = this.AC.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.value = cutoff;
    const g = this.AC.createGain();
    g.gain.value = 0.18 * vol;
    src.connect(flt);
    flt.connect(g);
    g.connect(this.sfxGain);
    src.start();
  }

  // Specialized sound effects
  sfxJump(runFrac) {
    const start = 700;
    const end = start + 200 * (1 - runFrac);
    this.sfxSweep(start, end, 0.12, "triangle", 0.9);
  }

  sfxLand(dropPx, dmg, safeDropPx) {
    const intensity = Phaser.Math.Clamp(dropPx / (safeDropPx * 2), 0.2, 1.0);
    this.sfxTone(140 - 50 * intensity, 0.07, "sine", 0.9 * intensity);
    this.sfxNoise(
      0.08 + 0.04 * intensity,
      0.7 * intensity,
      600 - 300 * intensity
    );
    if (dmg > 0) this.sfxTone(90, 0.12, "square", 0.6 * intensity);
  }

  sfxDebrisHitPlayer() {
    this.sfxTone(700, 0.05, "square", 0.5);
    this.sfxNoise(0.05, 0.4, 900);
  }

  sfxDebrisThud() {
    this.sfxTone(180, 0.05, "sine", 0.4);
    this.sfxNoise(0.05, 0.3, 500);
  }

  sfxCoinCollect() {
    this.sfxTone(800, 0.2, "triangle", 0.8);
    this.sfxTone(1000, 0.15, "sine", 0.6);
  }

  sfxHealthPackCollect() {
    // Healing sound - gentle, warm tones
    this.sfxTone(400, 0.3, "sine", 0.7);
    this.sfxTone(600, 0.25, "sine", 0.5);
    this.sfxTone(800, 0.2, "sine", 0.3);
  }

  sfxCheckpointSave() {
    // Save sound - triumphant chord progression
    this.sfxTone(523, 0.15, "triangle", 0.6); // C
    this.sfxTone(659, 0.15, "triangle", 0.5); // E
    this.sfxTone(784, 0.2, "triangle", 0.4); // G
    this.sfxTone(1047, 0.25, "sine", 0.3); // High C
  }
}
