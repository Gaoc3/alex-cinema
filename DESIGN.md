---
name: ALEX CINEMA
description: Luxury Synchronized Cinema Platform & Watch Party Design System
colors:
  primary: "#e50914"
  primary-hover: "#ff1e27"
  bg-obsidian: "#03060f"
  surface-card: "#0a0f1d"
  surface-glass: "rgba(10, 15, 29, 0.85)"
  text-main: "#ffffff"
  text-muted: "#94a3b8"
  accent-gold: "#fbbf24"
  accent-purple: "#c084fc"
typography:
  display:
    fontFamily: "'Cairo', sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.75rem)"
    fontWeight: 900
    lineHeight: 1.2
  headline:
    fontFamily: "'Cairo', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.3
  title:
    fontFamily: "'Cairo', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "'Cairo', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "'Cairo', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card-media:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "12px"
---

# Design System: ALEX CINEMA

## Overview

**Creative North Star: "The Obsidian Cinema Sanctuary"**

ALEX CINEMA delivers an uncompromising, theater-grade dark aesthetic tailored for modern synchronized social watching. Deep obsidian blacks (`#03060f`) provide an infinite contrast ratio that makes vibrant movie posters and crisp HDR video streams pop with vivid intensity. Rich cinema crimson (`#e50914`) is used deliberately for critical interactive states, neon glows, and live actions.

**Key Characteristics:**
- **Zero Light Pollution**: Pure dark backgrounds without jarring gray tones.
- **Controlled Neon Brilliance**: Laser-focused red glowing accents and subtle backdrop blurs.
- **Instantaneous Synchronization**: Ultra-smooth 300ms transitions with unified physical motion.

## Colors

A focused cinema-grade palette emphasizing depth, readability, and crimson accents.

### Primary
- **Cinema Crimson** (`#e50914`): Interactive triggers, primary buttons, live badges, and glowing highlights.
- **Crimson Vivid** (`#ff1e27`): Hover state illumination for active controls.

### Secondary
- **Starlight Gold** (`#fbbf24`): High-precision rating stars and review scores.
- **Series Violet** (`#c084fc`): Distinctive badges for episodic series and seasons.

### Neutral
- **Obsidian Black** (`#03060f`): Ground foundation for the viewport, room stage, and player framing.
- **Glass Slate** (`#0a0f1d`): Translucent elevated cards, dialog panels, and chat containers.
- **Pure White** (`#ffffff`): High-contrast primary titles, button text, and icons.
- **Cool Muted Slate** (`#94a3b8`): Secondary metadata, release years, and subtitle descriptions.

### Named Rules
**The Rarity Accent Rule.** Red neon is reserved exclusively for interactive focus, playback triggers, and live status. Never flood backgrounds with red.

## Typography

**Display & Body Font:** Cairo (`Cairo, sans-serif`) with system fallbacks.

### Hierarchy
- **Display** (900 Black, clamp(1.75rem, 4vw, 2.75rem), line-height 1.2): Hero titles and grand room headers.
- **Headline** (800 Bold, 1.5rem, line-height 1.3): Section headers (e.g. "الأكثر طلباً للمشاهدة الجماعية").
- **Title** (700 Bold, 1.125rem, line-height 1.4): Media card titles and modal headers.
- **Body** (500 Medium, 0.875rem, line-height 1.6): Chat messages, descriptions, and metadata.
- **Label** (700 Bold, 0.75rem, letter-spacing normal): Floating badges, timestamps, and quality tags.

## Layout

- **Spatial Model**: Fluid grid with responsive column stepping (2 columns on mobile, 3-4 on tablet, 5 on desktop).
- **Headroom & Breathing Room**: Generous vertical headroom (`pt-4 pb-8`) around scaleable interactive cards to prevent boundary clipping.
- **Custom Cinema Scrollbar**: Ultra-thin luxury scrollbar with crimson-to-dark gradient thumb.

## Elevation & Depth

Surfaces utilize translucent glassmorphism with subtle layered borders (`border-white/10`) and dynamic neon shadows on hover.

### Shadow Vocabulary
- **Card Ambient Hover** (`box-shadow: 0 12px 28px rgba(0,0,0,0.85), 0 0 18px rgba(229,9,20,0.3)`): Lifts cards on hover with crisp neon aura.
- **Play Capsule Pulse** (`box-shadow: 0 0 30px rgba(229,9,20,0.8)`): Glowing central play trigger.
- **Modal Glass Backing** (`box-shadow: 0 25px 60px -15px rgba(0,0,0,0.95), 0 0 40px rgba(229,9,20,0.15)`): Centers floating dialogs over frosted dark glass.

## Shapes

- **Corner Radius**: Smooth modern rounded geometry (`rounded-2xl` / 16px for cards and containers, `rounded-full` for badges and pills).
- **Borders**: Subdued 1px glass seams (`border-white/10`) transitioning to glowing crimson (`border-red-500`) on interaction.

## Components

### Media Cards
- **Shape**: `rounded-2xl`, aspect ratio 2:3, `isolate overflow-hidden`.
- **Background**: Rich dark obsidian base with vibrant full-bleed poster imagery.
- **Gradient**: Compact bottom text gradient (`h-28 bg-gradient-to-t from-black via-black/80 to-transparent`) preserving 80%+ poster clarity.
- **Hover**: 300ms scale-up (`scale-[1.03]`), red border shift, and central play capsule appearance.

### Room Chat & Reactions
- **Shape**: Rounded glass container (`rounded-2xl border border-white/10 bg-[#070b14]/90`).
- **Emoji Bar**: Translucent floating capsule with animated scale on hover.
- **Member Badges**: Distinctive color-coded role indicators (Host 👑, Admin 🛡️, Viewer 👤).

## Do's and Don'ts

### Do:
- **Do** preserve poster artwork brightness by restricting dark gradients to bottom text zones (`h-28`).
- **Do** maintain synchronous 300ms transitions across nested visual layers.
- **Do** provide generous container headroom (`pt-4 pb-8`) for transforming cards.

### Don't:
- **Don't** apply solid dark blocks or heavy 80%+ dark gradient overlays across poster images.
- **Don't** use low-contrast gray text on saturated colored badges (use crisp white or deep tints).
- **Don't** animate layout properties like `width` or `padding` directly (use GPU transforms instead).
