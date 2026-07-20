# SYSTEM — Design System

## 1. Design thesis

SYSTEM should feel like a precise instrument that has taken an interest in you.

The atmosphere is drawn from progression-fantasy system interfaces — mystery, dimensional depth, the
sense of an intelligence observing — but the _craft_ standard is taken from premium productivity
software: restraint, hierarchy, legibility, and motion that carries meaning.

The failure mode to avoid is "gaming UI": neon on everything, glow without purpose, particles as
decoration, unreadable text over busy backgrounds. Every effect must justify itself by communicating
state, directing attention, or marking a genuinely significant moment.

**Rule of restraint:** if an effect were removed and the user could not tell what was lost, it should
not exist. Glow marks importance. If everything glows, nothing is important.

## 2. Colour

Built on deep blue-blacks rather than neutral grey — cooler, more dimensional, and it makes the accent
family feel like emitted light rather than painted colour.

### Surfaces

| Token               | Value     | Use                                   |
| ------------------- | --------- | ------------------------------------- |
| `--surface-void`    | `#04060D` | Application background, deepest layer |
| `--surface-abyss`   | `#080B16` | Page background                       |
| `--surface-base`    | `#0D1220` | Panel background                      |
| `--surface-raised`  | `#131A2C` | Elevated panel, card                  |
| `--surface-overlay` | `#1A2338` | Modal, popover                        |
| `--surface-inset`   | `#070A12` | Wells, inputs, recessed areas         |

### Accent — the system's "voice"

| Token             | Value     | Meaning                                           |
| ----------------- | --------- | ------------------------------------------------- |
| `--accent-core`   | `#4A8CFF` | Primary. Interactive, active, the system speaking |
| `--accent-bright` | `#7FB2FF` | Emphasis, hover                                   |
| `--accent-deep`   | `#2B5FCC` | Pressed, borders                                  |
| `--accent-violet` | `#8B6CFF` | Mastery, skills, growth                           |
| `--accent-cyan`   | `#4FD9E8` | Analytics, data, measurement                      |
| `--accent-indigo` | `#5B4FCC` | Bosses, high-stakes challenge                     |
| `--silver`        | `#C4CEE0` | Rare, restrained. Rank and legacy only            |

### Semantic — never conveyed by colour alone

| Token              | Value     | Always paired with                            |
| ------------------ | --------- | --------------------------------------------- |
| `--state-positive` | `#3FCF8E` | Icon + text label                             |
| `--state-caution`  | `#E8B44F` | Icon + text label                             |
| `--state-critical` | `#E8685D` | Icon + text label                             |
| `--state-rest`     | `#6BA9C9` | Icon + text label. Calm blue, never "warning" |

Recovery is deliberately a _calm_ colour, not amber. Rest must never read visually as a problem.

### Text

| Token              | Value     | Contrast on `--surface-base`   |
| ------------------ | --------- | ------------------------------ |
| `--text-primary`   | `#E8EDF7` | 15.8:1                         |
| `--text-secondary` | `#A3AFC6` | 8.1:1                          |
| `--text-tertiary`  | `#6B7894` | 4.6:1                          |
| `--text-disabled`  | `#4A5468` | 2.9:1 — non-informational only |

All informational text meets WCAG AA; primary text meets AAA. Every accent-on-surface pairing used for
text is validated in `src/styles/contrast.test.ts` — contrast is enforced by a test, not by intention.

## 3. Typography

Two families, both open-licensed (see `docs/ASSET_LICENSES.md`).

- **Display / UI:** a geometric-humanist sans with a wide weight range, used from 300 to 700.
- **Data / Code:** a monospace with tabular figures, used for all numbers that change — XP, levels,
  timers, metrics. Numbers must never reflow while animating.

| Token              | Size / Line height | Weight | Use                                  |
| ------------------ | ------------------ | ------ | ------------------------------------ |
| `--type-cinematic` | 48 / 1.05          | 300    | Rank-up, legendary moments           |
| `--type-display`   | 32 / 1.15          | 400    | Screen titles                        |
| `--type-title`     | 22 / 1.25          | 500    | Section headers                      |
| `--type-heading`   | 17 / 1.35          | 600    | Card titles                          |
| `--type-body`      | 14 / 1.55          | 400    | Default                              |
| `--type-detail`    | 12.5 / 1.5         | 400    | Secondary information                |
| `--type-micro`     | 11 / 1.4           | 500    | Labels, uppercase, `0.08em` tracking |
| `--type-numeric`   | tabular            | 500    | All changing figures                 |

Large text uses _lighter_ weights, small text uses _heavier_ ones — this keeps optical weight even
across the hierarchy. Cinematic type is light and widely tracked; it should feel spacious and certain,
never shouted.

Text scales with a user-controlled multiplier (0.9–1.4×). Layouts use relative units throughout so
scaling never clips content.

## 4. Space and form

An 8 px base scale: `2, 4, 8, 12, 16, 24, 32, 48, 64, 96`.

Radii: `4` (inputs, chips), `8` (cards), `12` (panels), `16` (modals), `999` (pills).

**Panel construction** — the signature element. Depth comes from layering, not from heavy blur:

```
background:    linear-gradient(160deg, rgba(19,26,44,.92), rgba(13,18,32,.96))
border:        1px solid rgba(122,160,255,.10)
border-top:    1px solid rgba(122,160,255,.18)     /* light from above */
box-shadow:    0 1px 0 rgba(255,255,255,.03) inset,
               0 8px 32px rgba(0,0,0,.40),
               0 0 0 1px rgba(0,0,0,.20)
backdrop-filter: blur(12px) saturate(1.1)
```

A single consistent light source from above, a hairline top edge, and a genuine shadow. Backdrop blur
is capped at 12 px and disabled entirely in performance mode — heavy glassmorphism is both a
readability and a GPU cost.

Active or important panels gain a **dimensional border**: a subtle animated gradient along the edge,
never the fill. Importance is signalled at the boundary, so content stays readable.

## 5. Motion

Motion communicates causality: where something came from, what caused it, what changed.

| Token                 | Duration    | Easing                      | Use                            |
| --------------------- | ----------- | --------------------------- | ------------------------------ |
| `--motion-instant`    | 90 ms       | `cubic-bezier(.4,0,.2,1)`   | Hover, focus, toggle           |
| `--motion-quick`      | 160 ms      | `cubic-bezier(.4,0,.2,1)`   | Buttons, small reveals         |
| `--motion-standard`   | 260 ms      | `cubic-bezier(.32,.72,0,1)` | Panels, page transitions       |
| `--motion-deliberate` | 420 ms      | `cubic-bezier(.32,.72,0,1)` | Significant reveals            |
| `--motion-cinematic`  | 900–2400 ms | choreographed               | Rank-up, legendary achievement |

The standard easing is a strong decelerating curve — fast departure, soft arrival. Things feel
responsive on input and settle with weight.

**Choreography rules**

- Elements enter along the axis implied by their origin; nothing appears from nowhere.
- Related elements stagger 30–50 ms; never animate a list item-by-item beyond ~8 items.
- Exits are ~70 % of entry duration. Leaving should feel quicker than arriving.
- Never animate `width`, `height`, `top`, or `left`. Transform and opacity only.
- Only one cinematic may play at a time; others queue.

### Animation intensity (user setting)

| Level   | Behaviour                                           |
| ------- | --------------------------------------------------- |
| Full    | All choreography, particles, ambient motion         |
| Reduced | Transitions kept, particles off, ambient motion off |
| Minimal | Opacity fades only, ~100 ms                         |
| Off     | No animation; state changes are instant             |

`prefers-reduced-motion` forces at least **Reduced** on first run and is never silently overridden.
Under any reduced setting, cinematic moments become a **static composed frame** with the same
information and dignity — the user misses spectacle, never meaning or reward.

## 6. Particles

Canvas-based, budgeted, and purposeful.

| Context            | Max particles | Purpose                                |
| ------------------ | ------------- | -------------------------------------- |
| Ambient background | 40            | Depth; near-static drift               |
| Quest completion   | 24            | Confirmation at the point of action    |
| Level gain         | 60            | Convergence toward the level indicator |
| Rank-up            | 180           | The one genuinely maximal moment       |

Particles converge toward meaning — they gather at the thing that changed. They never drift randomly
across content, never sit over text, and always run below the text layer. The budget scales with the
animation-intensity setting and drops to zero under reduced motion. Frame cost is measured, and the
system sheds particles automatically if the frame budget is exceeded.

## 7. Sound

Fully original, procedurally synthesised via the Web Audio API — no sample files, therefore no
licensing exposure and a very small install (see `docs/ASSET_LICENSES.md`).

The palette is tuned, not noisy: a fixed pitch set derived from a minor-pentatonic root so that
overlapping events remain consonant rather than clashing.

| Event                   | Character                                                   |
| ----------------------- | ----------------------------------------------------------- |
| Interaction             | 12 ms sine tick, very low gain                              |
| Quest accepted          | Rising two-tone, soft attack                                |
| Quest completed         | Layered perfect fifth, gentle bloom                         |
| Level gained            | Three-note ascending figure with harmonic tail              |
| Skill advanced          | Single sustained tone, slow swell                           |
| Achievement (standard)  | Bright two-note confirmation                                |
| Achievement (rare)      | Four-note phrase with resonance                             |
| Achievement (legendary) | Full chord, long decay, sub-bass foundation                 |
| Rank up                 | Deep resonant swell, ~2.4 s, the lowest sound in the system |
| Recovery advisory       | Soft low pulse — calm, never alarming                       |
| Error                   | Neutral low tone — never harsh, never a buzzer              |

Independent volume controls for interface, events, cinematics, and ambient, plus a master mute.
Respects OS audio settings. **Every sound has a visible equivalent**, so audio is always
supplementary and never the sole carrier of information.

## 8. Visual progression

The interface evolves with rank. Critically, **early states are already premium** — progression adds
distinction, never removes quality. A new user must never be given a deliberately worse product.

| Rank         | Border                  | Ambient              | Accent          | Panel              |
| ------------ | ----------------------- | -------------------- | --------------- | ------------------ |
| Threshold    | Hairline                | Minimal drift        | Core blue       | Flat gradient      |
| Emergent     | Hairline + corner marks | Light drift          | Core blue       | Subtle inner light |
| Ascendant    | Gradient edge           | Slow currents        | Blue → violet   | Layered depth      |
| Vanguard     | Animated gradient       | Directional flow     | Violet emphasis | Dual-layer         |
| Paragon      | Dual-layer edge         | Structured field     | Violet + cyan   | Dimensional        |
| Sovereign    | Complex geometry        | Responsive to cursor | Full spectrum   | Full depth         |
| Transcendent | Unique per user         | Reactive field       | Silver accents  | Signature material |

Unlockables: auras, emblems, themes, particle profiles, sound profiles, profile frames, dashboard
backgrounds, quest-card treatments, skill-tree environments, Architect presentation modes.

**Every cosmetic state must pass the same contrast and readability tests as the base theme.** A reward
that degrades legibility is not shipped. Cosmetics are validated in CI against the contrast suite.

## 9. Accessibility

Non-negotiable, and treated as correctness rather than as a feature:

- Full keyboard navigation with a visible 2 px `--accent-bright` focus ring at 2 px offset.
- Logical tab order; focus trapped in modals and restored on close.
- Semantic HTML; ARIA only where semantics are genuinely insufficient.
- All non-decorative imagery labelled; decorative canvas marked `aria-hidden`.
- Status never conveyed by colour alone — always icon plus text.
- Colour-blind-safe: the accent family is distinguishable under deuteranopia and protanopia
  simulation; semantic states differ in shape and label, not merely hue.
- Cinematics are interruptible with `Esc` and never trap the user.
- Live regions announce achievements and level changes to screen readers, at a polite priority.
- Text scaling to 1.4× without clipping or overlap.

## 10. Interruption budget

A system that constantly interrupts is a system people mute and then ignore.

- At most one cinematic interruption per session unless the user opts into more. **Implemented**
  (ADR-0011, `useQuestEncounterQueue`): the first detected quest of a session is shown as a modal
  encounter (full or compact, by significance); every other quest that session is presented silently
  and summarised as a single dismissible line ("N missões adicionais foram preparadas") linking to
  Missões, rather than becoming a second dialog. The "unless the user opts into more" half is
  Settings' existing Cinematic/Compact/Silent presentation modes.
- Standard achievements queue into a corner stack, maximum three visible.
- Focus mode suppresses everything except explicit user-set timers.
- Level-ups below level 10 celebrate briefly; the ceremony scales with genuine rarity.
- Nothing interrupts during text entry.
- The user can postpone any cinematic and replay it later from the timeline — so a celebration
  deferred is never a celebration lost.
