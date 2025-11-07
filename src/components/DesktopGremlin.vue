<template>
  <Teleport to="body">
    <div
      v-if="!loading && !error"
      ref="containerRef"
      class="desktop-gremlin"
      :style="containerStyle"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @contextmenu.prevent="handleRightClick"
    >
      <canvas
        ref="canvasRef"
        :width="canvasSize.width"
        :height="canvasSize.height"
        class="desktop-gremlin__canvas"
      />
      <div
        v-if="headHotspot"
        class="desktop-gremlin__hotspot"
        :style="hotspotStyle"
        @mousedown.stop="handleHeadPat"
      />
    </div>
    <div v-else-if="loading" class="desktop-gremlin__loading">
      Loading gremlin...
    </div>
    <div v-else-if="error" class="desktop-gremlin__error">
      Error: {{ error.message }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type CSSProperties } from 'vue'
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import { State } from '@/types/states'
import type { CharacterName } from '@/types/character'
import { useSpriteManager } from '@/composables/useSpriteManager'
import { useStateMachine } from '@/composables/useStateMachine'
import { useAnimation } from '@/composables/useAnimation'
import { useMovementHandler } from '@/composables/useMovementHandler'
import { useSoundManager } from '@/composables/useSoundManager'

// Props
const props = defineProps<{
  character: CharacterName
}>()

// Refs
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const characterName = ref<CharacterName>(props.character)
const shouldFollowCursor = ref(false)

// Composables
const { config, loading, error, getSprite, initialize } = useSpriteManager(characterName)
const { playSound, enableSound, preloadSounds } = useSoundManager(characterName)
const movement = useMovementHandler({ followRadius: 150, moveSpeed: 5 })

// Timers
const idleTimerId = ref<number | null>(null)
const walkIdleTimerId = ref<number | null>(null)
const emoteTimerId = ref<number | null>(null)
const emoteDurationTimerId = ref<number | null>(null)

// State machine callbacks
const stateMachine = useStateMachine(config, {
  onSoundPlay: (soundFile: string) => {
    playSound(soundFile)
  },
  onResetIdleTimer: () => {
    resetIdleTimer()
  },
  onResetEmoteTimer: () => {
    resetEmoteTimer()
  },
  onStartWalkIdleTimer: () => {
    startWalkIdleTimer()
  },
  onStopWalkIdleTimer: () => {
    stopWalkIdleTimer()
  },
  onStartEmoteDurationTimer: (duration: number) => {
    startEmoteDurationTimer(duration)
  },
  onStopEmoteDurationTimer: () => {
    stopEmoteDurationTimer()
  },
})

// Animation callbacks
const animation = useAnimation(config, canvasRef, {
  onAnimationComplete: (state: State) => {
    handleAnimationComplete(state)
  },
})

// Computed
const canvasSize = computed(() => {
  if (!config.value) return { width: 300, height: 300 }
  return {
    width: config.value.spriteMap.FrameWidth,
    height: config.value.spriteMap.FrameHeight,
  }
})

const containerStyle = computed((): CSSProperties => ({
  position: 'fixed',
  left: `${movement.position.value.x}px`,
  top: `${movement.position.value.y}px`,
  width: `${canvasSize.value.width}px`,
  height: `${canvasSize.value.height}px`,
  cursor: movement.isDragging.value ? 'grabbing' : 'grab',
  zIndex: '9999',
  pointerEvents: 'auto',
}))

const headHotspot = computed(() => {
  if (!config.value) return null
  return {
    width: config.value.spriteMap.TopHotspotWidth,
    height: config.value.spriteMap.TopHotspotHeight,
  }
})

const hotspotStyle = computed((): CSSProperties => {
  if (!headHotspot.value) return {}
  const left = (canvasSize.value.width - headHotspot.value.width) / 2
  return {
    position: 'absolute',
    left: `${left}px`,
    top: '0px',
    width: `${headHotspot.value.width}px`,
    height: `${headHotspot.value.height}px`,
    // Debug: uncomment to see hotspot
    // background: 'rgba(255, 0, 0, 0.3)',
  }
})

// Timer management
function resetIdleTimer(): void {
  if (idleTimerId.value !== null) {
    clearTimeout(idleTimerId.value)
  }
  idleTimerId.value = window.setTimeout(() => {
    if (stateMachine.currentState.value === State.IDLE) {
      stateMachine.setState(State.SLEEPING)
    }
  }, 300000) // 5 minutes
}

function startWalkIdleTimer(): void {
  walkIdleTimerId.value = window.setTimeout(() => {
    if (stateMachine.currentState.value === State.WALK_IDLE) {
      stateMachine.transitionToIdleOrHover(movement.isMouseOver.value)
    }
  }, 2000) // 2 seconds
}

function stopWalkIdleTimer(): void {
  if (walkIdleTimerId.value !== null) {
    clearTimeout(walkIdleTimerId.value)
    walkIdleTimerId.value = null
  }
}

function resetEmoteTimer(): void {
  if (!config.value?.emoteConfig.AnnoyEmote) return

  if (emoteTimerId.value !== null) {
    clearTimeout(emoteTimerId.value)
  }

  const minMs = config.value.emoteConfig.MinEmoteTriggerMinutes * 60000
  const maxMs = config.value.emoteConfig.MaxEmoteTriggerMinutes * 60000
  const interval = Math.random() * (maxMs - minMs) + minMs

  emoteTimerId.value = window.setTimeout(() => {
    if (
      stateMachine.currentState.value === State.IDLE ||
      stateMachine.currentState.value === State.HOVER ||
      stateMachine.currentState.value === State.SLEEPING
    ) {
      stateMachine.setState(State.EMOTE)
    }
    resetEmoteTimer()
  }, interval)
}

function startEmoteDurationTimer(duration: number): void {
  emoteDurationTimerId.value = window.setTimeout(() => {
    if (stateMachine.currentState.value === State.EMOTE) {
      stateMachine.transitionToIdleOrHover(movement.isMouseOver.value)
      resetIdleTimer()
    }
  }, duration)
}

function stopEmoteDurationTimer(): void {
  if (emoteDurationTimerId.value !== null) {
    clearTimeout(emoteDurationTimerId.value)
    emoteDurationTimerId.value = null
  }
}

// Animation tick
async function animationTick(): Promise<void> {
  if (!config.value) return

  const state = stateMachine.currentState.value
  const frames = stateMachine.currentFrames.value
  const frameCounts = config.value.frameCount
  const spriteMap = config.value.spriteMap

  switch (state) {
    case State.INTRO:
      frames.Intro = await animation.playAnimation(
        state,
        frames.Intro,
        spriteMap.Intro,
        frameCounts.Intro,
        getSprite
      )
      break
    case State.IDLE:
      frames.Idle = await animation.playAnimation(
        state,
        frames.Idle,
        spriteMap.Idle,
        frameCounts.Idle,
        getSprite
      )
      break
    case State.HOVER:
      frames.Hover = await animation.playAnimation(
        state,
        frames.Hover,
        spriteMap.Hover,
        frameCounts.Hover,
        getSprite
      )
      break
    case State.DRAGGING:
      frames.Grab = await animation.playAnimation(
        state,
        frames.Grab,
        spriteMap.Grab,
        frameCounts.Grab,
        getSprite
      )
      break
    case State.CLICK:
      frames.Click = await animation.playAnimation(
        state,
        frames.Click,
        spriteMap.Click,
        frameCounts.Click,
        getSprite
      )
      break
    case State.PAT:
      frames.Pat = await animation.playAnimation(
        state,
        frames.Pat,
        spriteMap.Pat,
        frameCounts.Pat,
        getSprite
      )
      break
    case State.SLEEPING:
      frames.Sleep = await animation.playAnimation(
        state,
        frames.Sleep,
        spriteMap.Sleep,
        frameCounts.Sleep,
        getSprite
      )
      break
    case State.EMOTE:
      frames.Emote = await animation.playAnimation(
        state,
        frames.Emote,
        spriteMap.Emote,
        frameCounts.Emote,
        getSprite
      )
      break
    case State.WALK_IDLE:
      frames.WalkIdle = await animation.playAnimation(
        state,
        frames.WalkIdle,
        spriteMap.WalkIdle,
        frameCounts.WalkIdle,
        getSprite
      )
      break
    case State.WALKING:
      // Handle walking with direction
      movement.updatePosition()

      const direction = movement.getAnimationDirection()
      if (direction) {
        const directionKey = direction as keyof typeof frames
        const spriteKey = direction as keyof typeof spriteMap
        const spriteFile = spriteMap[spriteKey]
        frames[directionKey] = await animation.playAnimation(
          state,
          frames[directionKey],
          typeof spriteFile === 'string' ? spriteFile : '',
          frameCounts[directionKey],
          getSprite
        )
      }
      break
  }
}

function handleAnimationComplete(state: State): void {
  switch (state) {
    case State.INTRO:
      stateMachine.setState(State.IDLE)
      break
    case State.PAT:
    case State.CLICK:
      stateMachine.transitionToIdleOrHover(movement.isMouseOver.value)
      break
  }
}

// Event handlers
const handleMouseEnter = useDebounceFn(function (): void {
  movement.setMouseOver(true)
  resetIdleTimer()

  if (stateMachine.currentState.value === State.IDLE || stateMachine.currentState.value === State.WALKING) {
    stateMachine.setState(State.HOVER)
  }

  if (
    stateMachine.currentState.value !== State.WALKING &&
    stateMachine.currentState.value !== State.SLEEPING &&
    stateMachine.currentState.value !== State.CLICK &&
    stateMachine.currentState.value !== State.DRAGGING &&
    stateMachine.currentState.value !== State.EMOTE
  ) {
    playSound('hover.wav', 3)
  }
}, 100)

function handleMouseLeave(): void {
  if (stateMachine.currentState.value !== State.WALKING) {
    movement.setMouseOver(false)
  }

  if (stateMachine.currentState.value === State.HOVER) {
    stateMachine.setState(State.IDLE)
  }
}

function handleMouseMove(event: MouseEvent): void {
  if (movement.isDragging.value) {
    movement.updateDrag(event.clientX, event.clientY)
  }
}

function handleMouseDown(event: MouseEvent): void {
  // Enable sound on first interaction
  enableSound()

  if (stateMachine.currentState.value === State.EMOTE) {
    return
  }

  resetIdleTimer()
  resetEmoteTimer()

  if (event.button === 0) {
    // Left click
    if (
      stateMachine.currentState.value !== State.DRAGGING &&
      stateMachine.currentState.value !== State.PAT &&
      stateMachine.currentState.value !== State.CLICK
    ) {
      stateMachine.setState(State.DRAGGING)
      movement.startDrag(event.clientX, event.clientY)
    }
  }

  // Mouse up handler
  const handleMouseUp = () => {
    if (movement.isDragging.value) {
      movement.stopDrag()
      if (stateMachine.currentState.value === State.DRAGGING) {
        stateMachine.transitionToIdleOrHover(movement.isMouseOver.value)
      }
    }
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mouseup', handleMouseUp)
}

function handleRightClick(): void {
  enableSound()

  if (
    stateMachine.currentState.value !== State.DRAGGING &&
    stateMachine.currentState.value !== State.PAT &&
    stateMachine.currentState.value !== State.CLICK
  ) {
    stateMachine.setState(State.CLICK)
  }
}

function handleHeadPat(event: MouseEvent): void {
  event.stopPropagation()
  enableSound()

  if (
    stateMachine.currentState.value !== State.DRAGGING &&
    stateMachine.currentState.value !== State.CLICK &&
    stateMachine.currentState.value !== State.SLEEPING &&
    stateMachine.currentState.value !== State.EMOTE
  ) {
    resetIdleTimer()
    stateMachine.setState(State.PAT)
    // only follow cursor after head pad
    shouldFollowCursor.value = true
  }
}

// Global mouse tracking for cursor following
const handleGlobalMouseMove = useThrottleFn(function (event: MouseEvent): void {
  movement.updateMousePosition(event.clientX, event.clientY)

  // Calculate distance from gremlin center to cursor
  const centerX = movement.position.value.x + canvasSize.value.width / 2
  const centerY = movement.position.value.y + canvasSize.value.height / 2
  const dx = event.clientX - centerX
  const dy = event.clientY - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (
    stateMachine.currentState.value !== State.DRAGGING &&
    stateMachine.currentState.value !== State.PAT &&
    stateMachine.currentState.value !== State.CLICK &&
    stateMachine.currentState.value !== State.SLEEPING &&
    stateMachine.currentState.value !== State.EMOTE &&
    stateMachine.currentState.value !== State.WALK_IDLE
  ) {
    if (distance > 150 && distance < 400) { // followRadius
      if (stateMachine.currentState.value !== State.WALKING && shouldFollowCursor.value) {
        stateMachine.setState(State.WALKING)
        resetIdleTimer()
      }
    }
  }

  // Continue walking if already walking, stop when within radius
  if (stateMachine.currentState.value === State.WALKING) {
    // reach the target
    if (distance <= 150) {
      stateMachine.setState(State.WALK_IDLE)
      shouldFollowCursor.value = false
    }

    // target to far
    if (distance >= 600) {
      // TODO: do something different?
      stateMachine.setState(State.WALK_IDLE)
      shouldFollowCursor.value = false
    }
  }
}, 100)

// Lifecycle
onMounted(async () => {
  await initialize()
  await preloadSounds(characterName.value)

  if (config.value) {
    // Set center offset for movement calculations
    movement.setCenterOffset(
      config.value.spriteMap.FrameWidth / 2,
      config.value.spriteMap.FrameHeight / 2
    )

    // Initialize canvas
    animation.initCanvas()

    // Start animation loop
    const frameRateLimitedTick = animation.createFrameRateLimitedTick(
      config.value.spriteMap.FrameRate,
      animationTick
    )
    animation.startAnimationLoop(frameRateLimitedTick)

    // Add global mouse tracking for cursor following
    document.addEventListener('mousemove', handleGlobalMouseMove)

    // Start timers
    resetIdleTimer()
    if (config.value.emoteConfig.AnnoyEmote) {
      resetEmoteTimer()
    }

    // Play intro sound
    playSound('intro.wav')
  }
})

onUnmounted(() => {
  animation.stopAnimationLoop()
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  if (idleTimerId.value !== null) clearTimeout(idleTimerId.value)
  if (walkIdleTimerId.value !== null) clearTimeout(walkIdleTimerId.value)
  if (emoteTimerId.value !== null) clearTimeout(emoteTimerId.value)
  if (emoteDurationTimerId.value !== null) clearTimeout(emoteDurationTimerId.value)
})
</script>

<style scoped>
.desktop-gremlin {
  user-select: none;
  -webkit-user-select: none;
}

.desktop-gremlin__canvas {
  display: block;
  pointer-events: none;
}

.desktop-gremlin__hotspot {
  cursor: pointer;
}

.desktop-gremlin__loading,
.desktop-gremlin__error {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  font-family: sans-serif;
  z-index: 9999;
}

.desktop-gremlin__error {
  background: rgba(139, 0, 0, 0.9);
}
</style>
