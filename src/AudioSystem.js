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

    // Store music oscillators for proper cleanup
    this.musicOscillators = [];
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
    // Start synthesized Mario-style background music instead of loading audio file
    this.startSynthesizedMusic();

    const startMusic = () => {
      this.ensureAudioContext();
      if (this.AC.state === "suspended") this.AC.resume();
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

  startSynthesizedMusic() {
    if (this.musicStarted) return;
    this.ensureAudioContext();

    // Create multiple oscillators for a dark atmospheric sound
    const melody = this.AC.createOscillator();
    const harmony = this.AC.createOscillator();
    const bass = this.AC.createOscillator();

    // Store oscillators for proper cleanup
    this.musicOscillators = [melody, harmony, bass];

    melody.type = "sine"; // Smooth atmospheric lead
    harmony.type = "triangle";
    bass.type = "triangle"; // Changed from sawtooth to eliminate static

    // Create gain nodes for volume control
    const melodyGain = this.AC.createGain();
    const harmonyGain = this.AC.createGain();
    const bassGain = this.AC.createGain();

    melodyGain.gain.value = 0.3; // Reduced volume
    harmonyGain.gain.value = 0.2; // Reduced volume
    bassGain.gain.value = 0.1; // Much lower bass to eliminate static

    // Connect to music gain
    melody.connect(melodyGain);
    harmony.connect(harmonyGain);
    bass.connect(bassGain);

    melodyGain.connect(this.musicGain);
    harmonyGain.connect(this.musicGain);
    bassGain.connect(this.musicGain);

    melody.start();
    harmony.start();
    bass.start();

    // Original dark atmospheric melody with lower frequencies
    let i = 0;
    // Main melody - mysterious and atmospheric in lower register
    const melodyNotes = [
      220.0, 0, 246.94, 0, 261.63, 220.0, 0, 196.0, 0, 0, 220.0, 0, 246.94,
      261.63, 0, 220.0, 196.0, 0, 0, 174.61, 196.0, 220.0, 0, 0, 246.94, 0,
      261.63, 0, 293.66, 0, 246.94, 220.0, 0, 196.0, 0, 0, 220.0, 246.94, 0,
      261.63, 0, 220.0, 196.0, 0, 174.61, 0, 0, 0, 220.0, 0, 246.94, 0, 261.63,
      220.0, 0, 196.0, 0, 0, 220.0, 0,
    ]; // Original composition in lower A3-C4 range

    // Harmony line - deep atmospheric chords
    const harmonyNotes = [
      146.83, 164.81, 174.61, 196.0, 146.83, 164.81, 174.61, 196.0, 130.81,
      146.83, 164.81, 174.61, 130.81, 146.83, 164.81, 174.61, 155.56, 174.61,
      196.0, 220.0, 155.56, 174.61, 196.0, 220.0, 138.59, 155.56, 174.61, 196.0,
      138.59, 155.56, 174.61, 196.0, 146.83, 164.81, 174.61, 196.0, 146.83,
      164.81, 174.61, 196.0, 130.81, 146.83, 164.81, 174.61, 130.81, 146.83,
      164.81, 174.61, 155.56, 174.61, 196.0, 220.0, 155.56, 174.61, 196.0,
      220.0, 138.59, 155.56, 174.61, 196.0, 138.59, 155.56, 174.61, 196.0,
    ];

    // Bass line - deep sub-bass foundation
    const bassNotes = [
      73.42, 0, 73.42, 0, 82.41, 0, 82.41, 0, 87.31, 0, 87.31, 0, 73.42, 0,
      65.41, 0, 65.41, 0, 73.42, 0, 73.42, 0, 82.41, 0, 82.41, 0, 87.31, 0,
      92.5, 0, 92.5, 0, 98.0, 0, 98.0, 0, 87.31, 0, 87.31, 0, 82.41, 0, 73.42,
      0, 73.42, 0, 65.41, 0, 65.41, 0, 73.42, 0, 73.42, 0, 82.41, 0,
    ];

    this.musicTimer = setInterval(() => {
      if (!this.AC) return;

      const melodyNote = melodyNotes[i % melodyNotes.length];
      const harmonyNote = harmonyNotes[i % harmonyNotes.length];
      const bassNote = bassNotes[i % bassNotes.length];

      // Play melody (if not a rest)
      if (melodyNote > 0) {
        melody.frequency.setTargetAtTime(melodyNote, this.AC.currentTime, 0.01);
      }

      // Play harmony
      if (harmonyNote > 0) {
        harmony.frequency.setTargetAtTime(
          harmonyNote,
          this.AC.currentTime,
          0.01
        );
      }

      // Play bass (if not a rest)
      if (bassNote > 0) {
        bass.frequency.setTargetAtTime(bassNote, this.AC.currentTime, 0.01);
      }

      i++;
    }, 300); // Slower atmospheric pace - 300ms per note for moody feel

    this.musicStarted = true;
  }

  startMusic() {
    // Legacy method - redirect to synthesized music
    this.startSynthesizedMusic();
  }

  stopMusic() {
    // Clear the music timer
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    // Stop and disconnect all music oscillators
    if (this.musicOscillators && this.musicOscillators.length > 0) {
      this.musicOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // Oscillator might already be stopped, ignore error
        }
      });
      this.musicOscillators = [];
    }

    this.musicStarted = false;

    // Fade out music gain to create smooth stop
    if (this.musicGain && this.AC) {
      this.musicGain.gain.setTargetAtTime(0, this.AC.currentTime, 0.3);
    }
  }
  restartMusic() {
    // Stop any existing music first
    this.stopMusic();

    // Reset music gain and restart after a brief delay
    setTimeout(() => {
      if (this.musicGain && this.AC) {
        this.musicGain.gain.setTargetAtTime(0.05, this.AC.currentTime, 0.1);
      }
      this.startSynthesizedMusic();
    }, 500); // Small delay to let the stop fade complete
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

  sfxPlayerDeath() {
    // Stop background music when player dies
    this.stopMusic();

    // Death sound - dramatic descending sweep with noise burst
    this.sfxSweep(400, 80, 1.2, "square", 0.8); // Dramatic descending sweep
    this.sfxNoise(0.4, 0.6, 200); // Death rattle noise

    // Add delayed lower tone for finality
    setTimeout(() => {
      this.sfxTone(60, 0.8, "sine", 0.4); // Deep final tone
    }, 200);
  }

  sfxGameOver() {
    // Game over sound - dramatic and final
    // Descending minor chord progression for sadness/finality
    this.sfxTone(440, 0.8, "triangle", 0.7); // A
    this.sfxTone(349, 0.9, "triangle", 0.6); // F
    this.sfxTone(261, 1.0, "triangle", 0.8); // C

    // Add dramatic sweep down
    setTimeout(() => {
      this.sfxSweep(200, 60, 1.5, "sine", 0.5);
    }, 400);

    // Final deep resonant tone
    setTimeout(() => {
      this.sfxTone(41, 2.0, "sine", 0.4); // Very low E
    }, 800);
  }
}
