/**
 * Procedural sound engine.
 *
 * Every sound is synthesised at runtime via the Web Audio API. Nothing is
 * sampled, so there is no licensing exposure, no asset pipeline, and the whole
 * sound identity costs zero bytes of install size.
 *
 * Pitches come from a fixed minor-pentatonic set so overlapping events stay
 * consonant rather than clashing — which matters because several can fire at
 * once when a completion also triggers a level and an achievement.
 */

export type SoundName =
  | 'interact'
  | 'questAccepted'
  | 'questCompleted'
  | 'levelGained'
  | 'achievementStandard'
  | 'achievementRare'
  | 'achievementLegendary'
  | 'rankUp'
  | 'advisory'
  | 'error';

export type SoundChannel = 'interface' | 'events' | 'cinematic';

interface SoundSpec {
  readonly channel: SoundChannel;
  /** Frequencies in Hz, played together or in sequence. */
  readonly notes: readonly number[];
  readonly type: OscillatorType;
  readonly duration: number;
  /** Delay between notes; 0 plays them as a chord. */
  readonly stagger: number;
  readonly gain: number;
  /** Optional sub-bass reinforcement for the largest moments. */
  readonly sub?: number;
}

// A minor pentatonic on A — chosen because any subset sounds intentional.
const A3 = 220.0;
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;

const SOUNDS: Readonly<Record<SoundName, SoundSpec>> = {
  interact: {
    channel: 'interface',
    notes: [A4],
    type: 'sine',
    duration: 0.012,
    stagger: 0,
    gain: 0.05,
  },
  questAccepted: {
    channel: 'events',
    notes: [C4, G4],
    type: 'sine',
    duration: 0.16,
    stagger: 0.055,
    gain: 0.1,
  },
  questCompleted: {
    channel: 'events',
    notes: [A3, E4, A4],
    type: 'sine',
    duration: 0.42,
    stagger: 0.045,
    gain: 0.12,
  },
  levelGained: {
    channel: 'events',
    notes: [C4, E4, G4, C5],
    type: 'triangle',
    duration: 0.62,
    stagger: 0.075,
    gain: 0.13,
  },
  achievementStandard: {
    channel: 'events',
    notes: [E4, A4],
    type: 'triangle',
    duration: 0.3,
    stagger: 0.06,
    gain: 0.12,
  },
  achievementRare: {
    channel: 'events',
    notes: [A3, C4, E4, A4],
    type: 'triangle',
    duration: 0.75,
    stagger: 0.08,
    gain: 0.14,
  },
  achievementLegendary: {
    channel: 'cinematic',
    notes: [A3, E4, A4, C5, E5],
    type: 'triangle',
    duration: 1.9,
    stagger: 0.11,
    gain: 0.16,
    sub: 55,
  },
  rankUp: {
    // The lowest, longest sound in SYSTEM. Reserved for the rarest moment.
    channel: 'cinematic',
    notes: [A3, D4, A4, D5],
    type: 'sine',
    duration: 2.4,
    stagger: 0.16,
    gain: 0.18,
    sub: 41.2,
  },
  advisory: {
    // Calm, never alarming — a recovery advisory must not create anxiety.
    channel: 'events',
    notes: [D4, A3],
    type: 'sine',
    duration: 0.5,
    stagger: 0.1,
    gain: 0.08,
  },
  error: {
    // Neutral, never a buzzer. Errors are information, not punishment.
    notes: [C4, A3],
    channel: 'interface',
    type: 'sine',
    duration: 0.22,
    stagger: 0.05,
    gain: 0.08,
  },
};

export interface AudioSettings {
  readonly muted: boolean;
  readonly master: number;
  readonly interface: number;
  readonly events: number;
  readonly cinematic: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  master: 0.7,
  interface: 0.6,
  events: 1,
  cinematic: 1,
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;

  configure(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Browsers require a user gesture before audio may start, so the context is
   * created lazily on the first real interaction rather than at load.
   */
  private ensureContext(): AudioContext | null {
    if (this.settings.muted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.context) {
      try {
        this.context = new AudioContext();
      } catch {
        return null;
      }
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  play(name: SoundName): void {
    const spec = SOUNDS[name];
    const ctx = this.ensureContext();
    if (!ctx) return;

    const channelGain = this.settings[spec.channel];
    const level = spec.gain * channelGain * this.settings.master;
    if (level <= 0) return;

    const startedAt = ctx.currentTime + 0.01;

    spec.notes.forEach((frequency, index) => {
      const at = startedAt + index * spec.stagger;
      this.tone(ctx, frequency, at, spec.duration, level, spec.type);
    });

    if (spec.sub) {
      this.tone(ctx, spec.sub, startedAt, spec.duration * 1.2, level * 0.55, 'sine');
    }
  }

  private tone(
    ctx: AudioContext,
    frequency: number,
    at: number,
    duration: number,
    level: number,
    type: OscillatorType,
  ): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);

    // A short attack and a long exponential decay. Instant onset would click;
    // a linear decay would sound synthetic.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + Math.min(0.02, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
  }
}

export const audio = new AudioEngine();
