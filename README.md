# @nkhdo/desktop-gremlin

A Vue 3 + TypeScript component library for animated desktop pets in web applications.

Ported from [linux-desktop-gremlin](https://github.com/iluvgirlswithglasses/linux-desktop-gremlin).

## Features

- 🎨 Animated sprite-based characters
- 🖱️ Interactive drag & drop
- 👆 Click interactions (right-click, head pat)
- 🎵 Sound effects
- 🤖 Cursor following behavior
- 😴 Idle and sleep states
- 🎭 Random emotes
- 📦 TypeScript support
- 🎯 Type-safe state machine

## Installation

```bash
pnpm install @nkhdo/desktop-gremlin
```

## Usage

```vue
<template>
  <div id="app">
    <h1>My App</h1>
    <DesktopGremlin character="mambo" />
  </div>
</template>

<script setup>
import { DesktopGremlin } from '@nkhdo/desktop-gremlin'
import '@nkhdo/desktop-gremlin/style.css'
</script>
```

## Available Characters

- `mambo` - Matikanetannhauser
- `rice-shower` - Rice Shower

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `character` | `'mambo' \| 'rice-shower'` | Yes | The character to display |

## Interactions

- **Drag & Drop**: Click and drag the gremlin to move it around
- **Cursor Following**: The gremlin follows your cursor when you hover over it
- **Right-Click**: Triggers a special animation (Mambo time!)
- **Head Pat**: Click the top of the gremlin's head to pat it
- **Idle States**: After 5 minutes of no interaction, the gremlin falls asleep
- **Random Emotes**: If enabled in character config, the gremlin will occasionally emote

## Development

```bash
# Install dependencies
pnpm install

# Run development demo (with hot reload)
pnpm run dev

# Build the library
pnpm run build

# Preview production build
pnpm run preview
```

The development server will start at `http://localhost:5173` with a demo page showcasing the component.

## License

MIT

## Credits

- Original Python implementation: [iluvgirlswithglasses/linux-desktop-gremlin](https://github.com/iluvgirlswithglasses/linux-desktop-gremlin)
- Inspired by: [KurtVelasco's Desktop Gremlin](https://github.com/KurtVelasco/Desktop_Gremlin)
