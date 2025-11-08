# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Vue 3 + TypeScript component library that creates animated desktop pets (gremlins) for web applications. The library is sprite-based with interactive behaviors like dragging, cursor following, head patting, and various idle states. Originally ported from [linux-desktop-gremlin](https://github.com/iluvgirlswithglasses/linux-desktop-gremlin).

## Development Commands

```bash
# Development server with hot reload
pnpm run dev

# Build library for distribution
pnpm run build

# Preview production build
pnpm run preview
```

The dev server runs at `http://localhost:5173` with a demo page (`DemoApp.vue`).

## Build System

- **Build tool**: Vite with library mode
- **TypeScript**: Strict mode enabled, uses `vue-tsc` for type checking
- **Library exports**:
  - ES module: `dist/desktop-gremlin.js`
  - UMD: `dist/desktop-gremlin.umd.cjs`
  - Types: `dist/index.d.ts`
  - Styles: `dist/style.css`
- Vue is externalized (peer dependency)
- Path alias: `@/*` maps to `./src/*`

## Architecture

### Component Structure

The main component is `DesktopGremlin.vue`, which uses a **composable-based architecture** where each composable manages a specific concern:

- **`useSpriteManager`**: Loads and caches character sprites and config files (sprite-map.json, frame-count.json, emote-config.json) from `src/assets/characters/{character}/`
- **`useStateMachine`**: Manages state transitions between states (INTRO, IDLE, HOVER, WALKING, DRAGGING, CLICK, PAT, SLEEPING, EMOTE, etc.) with callback-based side effects
- **`useAnimation`**: Handles canvas rendering and frame-rate-limited animation loops
- **`useMovementHandler`**: Manages position, dragging, cursor following logic with velocity calculations
- **`useSoundManager`**: Loads and plays character-specific sound effects from `src/assets/characters/{character}/sounds/`

### State Machine Flow

The gremlin operates through a state machine defined in `types/states.ts`:
- **INTRO** → IDLE (after intro animation completes)
- **IDLE** ↔ **HOVER** (on mouse enter/leave)
- **IDLE/HOVER** → **DRAGGING** (on mouse down)
- **IDLE/HOVER** → **PAT** (on head hotspot click)
- **IDLE/HOVER** → **CLICK** (on right-click)
- **HOVER** → **WALKING** (when cursor 150-400px away after head pat)
- **WALKING** → **WALK_IDLE** (when within 150px or beyond 600px)
- **IDLE** → **SLEEPING** (after 5 minutes of inactivity)
- **IDLE/HOVER/SLEEPING** → **EMOTE** (random timer if enabled)

State transitions are handled in `useStateMachine` with callbacks to trigger side effects (sounds, timers, etc.).

### Character Configuration

Each character lives in `src/assets/characters/{character}/` with:
- PNG sprite sheets for each animation state (idle.png, hover.png, click.png, etc.)
- `sprite-map.json`: Maps animation states to sprite filenames, defines frame dimensions, frame rate, and hotspot dimensions
- `frame-count.json`: Number of frames per animation
- `emote-config.json`: Random emote behavior settings (enabled, min/max interval, duration)
- `sounds/`: Directory containing WAV files for sound effects

Sprites are loaded via Vite's `import.meta.glob` and cached in `useSpriteManager`.

### Animation System

Animations use sprite sheets with multiple frames arranged in columns:
- Each state (Idle, Hover, Walking directions, etc.) has its own sprite sheet
- `useAnimation` renders frames to a canvas element using `CanvasRenderingContext2D`
- Frame rate is controlled via the character's `FrameRate` config
- Walking animations have 8 directional sprites (Up, Down, Left, Right, UpLeft, UpRight, DownLeft, DownRight)

### Timer Management

The component manages several timers:
- **idleTimer**: 5-minute countdown to SLEEPING state
- **walkIdleTimer**: 2-second delay before returning to IDLE/HOVER from WALK_IDLE
- **emoteTimer**: Random interval for triggering emotes
- **emoteDurationTimer**: Controls how long emotes last

Timers are reset on user interactions and cleaned up in `onUnmounted`.

### Event Handling

- **Mouse enter**: Triggers HOVER state and hover sound (debounced 100ms)
- **Mouse move**: Updates drag position or cursor following
- **Mouse down**: Starts dragging, enables sound on first interaction
- **Mouse up**: Stops dragging
- **Right-click**: Triggers CLICK state
- **Head hotspot click**: Triggers PAT state and enables cursor following
- **Global mouse move**: Tracked with throttled handler (100ms) for cursor following behavior

Uses `@vueuse/core` for `useDebounceFn` and `useThrottleFn`.

### Cursor Following Behavior

- Only activates after head pat interaction (via `shouldFollowCursor` flag)
- Gremlin follows cursor when distance is 150-400px
- Stops following when within 150px (reached target) or beyond 600px (too far)
- Uses `useMovementHandler` to calculate velocity and direction for smooth movement

## Adding New Characters

1. Create directory: `src/assets/characters/{character-name}/`
2. Add PNG sprite sheets for all required animations
3. Create JSON configs: `sprite-map.json`, `frame-count.json`, `emote-config.json`
4. Add sounds to `sounds/` subdirectory
5. Update `CharacterName` type in `src/types/character.ts`

All sprite assets are automatically loaded via glob imports in `useSpriteManager`.

## Type Safety

- All states are strongly typed via `State` enum
- Character configs use TypeScript interfaces (`CharacterConfig`, `SpriteMapConfig`, `FrameCountConfig`, `EmoteConfig`)
- Position and velocity are typed as `{ x: number, y: number }`
- Animation directions are typed literals
- Component uses Composition API with `<script setup lang="ts">`
