/**
 * Audio narration & ambient soundtrack manager
 * Provides Web Speech API narration and procedural Web Audio soundtrack with dynamic ducking!
 */

class AudioPlayerService {
  private audioCtx: AudioContext | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private isMusicPlaying = false;
  private currentVolume = 0.5;
  private isMuted = false;
  private synth: SpeechSynthesis | null = null;
  private voicePreference: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.synth = window.speechSynthesis || null;
        this.initVoices();
      } catch (e) {
        console.warn('SpeechSynthesis unavailable in this environment', e);
        this.synth = null;
      }
    }
  }

  private initVoices() {
    try {
      if (!this.synth) return;
      const load = () => {
        try {
          const voices = this.synth?.getVoices() || [];
          const preferred = voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Neural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Alex'))
          );
          this.voicePreference = preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
        } catch {}
      };
      load();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = load;
      }
    } catch {}
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioCtx.currentTime);
      this.masterGainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Generates a warm, cinematic ambient drone soundtrack using Web Audio oscillators & filters
   */
  public startSoundtrack(mood = 'Cinematic') {
    if (this.isMusicPlaying) return;
    try {
      const ctx = this.getAudioContext();
      this.stopSoundtrack();

      this.musicGainNode = ctx.createGain();
      // Base background music volume (ducked lower than speech)
      this.musicGainNode.gain.setValueAtTime(0.18, ctx.currentTime);
      this.musicGainNode.connect(this.masterGainNode!);

      // Low-pass filter for warm cinematic aesthetic
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);
      filter.connect(this.musicGainNode);

      // Chords based on mood:
      const frequencies = mood.includes('Tech')
        ? [65.41, 130.81, 196.0, 293.66] // C2, C3, G3, D4
        : [55.0, 110.0, 164.81, 220.0]; // A1, A2, E3, A3

      this.musicOscillators = frequencies.map((freq, i) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // LFO subtle vibrato/shimmer
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(0.12 + i * 0.05, ctx.currentTime);
        lfoGain.gain.setValueAtTime(1.2, ctx.currentTime);
        lfo.connect(osc.frequency);
        lfo.start();

        oscGain.gain.setValueAtTime(0.08 / (i + 1), ctx.currentTime);
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start();
        return osc;
      });

      this.isMusicPlaying = true;
    } catch (e) {
      console.warn('AudioContext not allowed without user gesture yet', e);
    }
  }

  public stopSoundtrack() {
    this.musicOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.musicOscillators = [];
    this.isMusicPlaying = false;
  }

  /**
   * Speak narration text with voiceover and automatically duck background music
   */
  public speakNarration(text: string, onEnd?: () => void, rate = 1.0) {
    if (!this.synth || this.isMuted) {
      if (onEnd) setTimeout(onEnd, 1000);
      return;
    }

    this.stopNarration();

    // Duck background music when speaking
    if (this.musicGainNode && this.audioCtx) {
      this.musicGainNode.gain.setTargetAtTime(0.06, this.audioCtx.currentTime, 0.2);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voicePreference) {
      utterance.voice = this.voicePreference;
    }
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = this.isMuted ? 0 : this.currentVolume;

    utterance.onend = () => {
      // Restore background music volume
      if (this.musicGainNode && this.audioCtx) {
        this.musicGainNode.gain.setTargetAtTime(0.18, this.audioCtx.currentTime, 0.4);
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (this.musicGainNode && this.audioCtx) {
        this.musicGainNode.gain.setTargetAtTime(0.18, this.audioCtx.currentTime, 0.4);
      }
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  public stopNarration() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGainNode && this.audioCtx) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioCtx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGainNode && this.audioCtx) {
      this.masterGainNode.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.audioCtx.currentTime);
    }
    if (this.isMuted) {
      this.stopNarration();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public pauseAll() {
    this.stopNarration();
    this.stopSoundtrack();
  }
}

export const audioPlayer = new AudioPlayerService();
