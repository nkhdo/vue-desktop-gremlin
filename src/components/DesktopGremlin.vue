<template>
  <Teleport to="body">
    <div
      v-if="!loading && !error"
      class="desktop-gremlin"
      :style="containerStyle"
      v-on="scripted ? {} : {
        mouseenter: handleMouseEnter,
        mouseleave: handleMouseLeave,
        mousedown: handleMouseDown,
        contextmenu: (e: Event) => { e.preventDefault(); handleRightClick() }
      }"
    >
      <canvas
        ref="canvasRef"
        :width="canvasSize.width"
        :height="canvasSize.height"
        :style="canvasStyle"
        class="desktop-gremlin__canvas"
      />
      <div
        v-if="headHotspot && !scripted"
        class="desktop-gremlin__hotspot"
        :style="hotspotStyle"
        @mousedown.left.stop="handleHeadPat"
      />
      <div
        v-if="$slots.default"
        class="desktop-gremlin__message-box"
        :class="`desktop-gremlin__message-box--${messageBoxPosition}`"
      >
        <slot />
      </div>
    </div>
    <div v-else-if="loading" class="desktop-gremlin__loading">
      Loading gremlin...
    </div>
    <div v-else-if="error" class="desktop-gremlin__error">
      Error: {{ error.message }}
    </div>
    <div
      v-if="debug"
      :style="{
        position: 'fixed',
        top: `${movement.position.value.y}px`,
        left: `${movement.position.value.x}px`,
        zIndex: 10000,
        color: 'red',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)'
      }"
    >•</div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type CSSProperties, useTemplateRef, toRef } from 'vue'
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import { State } from '@/types/states'
import type { CharacterName } from '@/types/character'
import { useSpriteManager } from '@/composables/useSpriteManager'
import { useStateMachine } from '@/composables/useStateMachine'
import { useAnimation } from '@/composables/useAnimation'
import { useMovementHandler } from '@/composables/useMovementHandler'
import { useSoundManager } from '@/composables/useSoundManager'

// Props
const props = withDefaults(defineProps<{
  character: CharacterName
  followRadius?: number
  moveSpeed?: number
  debug?: boolean
  scripted?: boolean
  volume?: number
  messageBoxPosition?: 'left' | 'right'
}>(), {
  followRadius: 50,
  moveSpeed: 5,
  debug: false,
  scripted: false,
  volume: 0.8,
  messageBoxPosition: 'right'
})

// V-model for position
const positionModel = defineModel<{ x: number, y: number }>('position', {
  default: () => ({ x: 0, y: 0 })
})

// Refs
const canvasRef = useTemplateRef('canvasRef')
const characterName = toRef(() => props.character)
const shouldFollowCursor = ref(false)

// Composables
const { config, loading, error, getSprite, initialize } = useSpriteManager(characterName)
const { playSound, enableSound, preloadSounds, setVolume } = useSoundManager(characterName, {
  initialVolume: props.volume
})
const movement = useMovementHandler({
  followRadius: props.followRadius,
  moveSpeed: props.moveSpeed,
  initialPosition: positionModel.value
})

// Sync internal movement position with v-model
watch(() => movement.position.value, (newPosition) => {
  positionModel.value = { ...newPosition }
}, { deep: true })

// Sync v-model changes to internal movement position
watch(positionModel, (newPosition) => {
  if (newPosition && (
    newPosition.x !== movement.position.value.x ||
    newPosition.y !== movement.position.value.y
  )) {
    movement.position.value = { ...newPosition }
  }
}, { deep: true })

// Watch volume prop changes
watch(() => props.volume, (newVolume) => {
  setVolume(newVolume)
})

// Timers
const idleTimerId = ref<number | null>(null)
const walkIdleTimerId = ref<number | null>(null)
const emoteTimerId = ref<number | null>(null)
const emoteDurationTimerId = ref<number | null>(null)
const isInfiniteEmote = ref(false)

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
  width: `${canvasSize.value.width / 2}px`,
  height: `${canvasSize.value.height - (config.value?.spriteMap.TopShift ?? 0)}px`,
  cursor: props.scripted ? 'default' : (movement.isDragging.value ? 'grabbing' : 'grab'),
  zIndex: '9999',
  pointerEvents: props.scripted ? 'none' : 'auto',
  transformOrigin: 'center center',
  transform: 'translate(-50%, -50%)',
  borderRadius: '100%',
  background: props.debug ? 'rgba(255, 0, 0, 0.3)' : undefined
}))

const canvasStyle = computed((): CSSProperties => ({
  position: 'absolute',
  left: `${-canvasSize.value.width / 4}px`,
  top: `-${config.value?.spriteMap.TopShift ?? 0}px`
}))

const headHotspot = computed(() => {
  if (!config.value) return null
  return {
    width: config.value.spriteMap.TopHotspotWidth,
    height: config.value.spriteMap.TopHotspotHeight - (config.value.spriteMap.TopShift ?? 0),
  }
})

const hotspotStyle = computed((): CSSProperties => {
  if (!headHotspot.value) return {}
  const left = (canvasSize.value.width/2 - headHotspot.value.width) / 2
  return {
    position: 'absolute',
    left: `${left}px`,
    top: '0px',
    width: `${headHotspot.value.width}px`,
    height: `${headHotspot.value.height}px`,
    borderRadius: '100%',
    background: props.debug ? 'rgba(255, 0, 0, 0.3)' : undefined,
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
  // Skip timer if infinite emote is enabled
  if (props.scripted && isInfiniteEmote.value) {
    return
  }

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
      } else {
        stateMachine.transitionToIdleOrHover(movement.isMouseOver.value)
        shouldFollowCursor.value = false
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
  shouldFollowCursor.value = false
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

      // Mouse move handler for dragging
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (movement.isDragging.value) {
          movement.updateDrag(moveEvent.clientX, moveEvent.clientY)
        }
      }

      // Mouse up handler
      const handleMouseUp = () => {
        if (movement.isDragging.value) {
          movement.stopDrag()
          shouldFollowCursor.value = false // shouldnt follow cursor after being dragged to a new place
          if (stateMachine.currentState.value === State.DRAGGING) {
            stateMachine.transitionToIdleOrHover(movement.isMouseOver.value)
          }
        }
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }
}

function handleRightClick(): void {
  enableSound()

  if (
    stateMachine.currentState.value !== State.DRAGGING &&
    stateMachine.currentState.value !== State.PAT &&
    stateMachine.currentState.value !== State.CLICK
  ) {
    stateMachine.setState(State.CLICK)
    // only follow cursor after right click
    shouldFollowCursor.value = true
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
  }
}

// Global mouse tracking for cursor following
const handleGlobalMouseMove = useThrottleFn(function (event: MouseEvent): void {
  movement.updateMousePosition(event.clientX, event.clientY)

  // Calculate distance from gremlin center to cursor
  const { x: centerX, y: centerY } = movement.position.value
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
    if (distance > props.followRadius && distance < props.followRadius * 10) {
      if (
        stateMachine.currentState.value !== State.WALKING &&
        shouldFollowCursor.value &&
        !movement.isMouseOver.value
      ) {
        stateMachine.setState(State.WALKING)
        resetIdleTimer()
      }
    }
  }

  // Continue walking if already walking, stop when within radius
  if (stateMachine.currentState.value === State.WALKING) {
    // reach the target
    if (distance <= props.followRadius) {
      stateMachine.setState(State.WALK_IDLE)
      shouldFollowCursor.value = false
    }

    // target to far
    if (distance >= props.followRadius * 10) {
      // TODO: do something different?
      stateMachine.setState(State.WALK_IDLE)
      shouldFollowCursor.value = false
    }
  }
}, 100)

// Exposed functions for scripted mode
/**
 * Move gremlin to a specific position
 */
function moveTo(x: number, y: number, smooth = false): void {
  if (!props.scripted) {
    return
  }
  if (smooth) {
    // Set target and trigger walking animation
    isInfiniteEmote.value = false
    movement.updateMousePosition(x, y)
    shouldFollowCursor.value = true
    stateMachine.setState(State.WALKING)
  } else {
    // Instant move
    movement.position.value = { x, y }
  }
}

/**
 * Trigger sleep state
 */
function sleep(): void {
  if (!props.scripted) {
    return
  }
  isInfiniteEmote.value = false
  stateMachine.setState(State.SLEEPING)
}

/**
 * Trigger emote state
 * @param infinite - If true, emote will loop infinitely until stopped
 */
function emote(infinite = false): void {
  if (!props.scripted) {
    return
  }
  isInfiniteEmote.value = infinite
  stateMachine.setState(State.EMOTE)
}

/**
 * Return to idle state
 */
function idle(): void {
  if (!props.scripted) {
    return
  }
  isInfiniteEmote.value = false
  shouldFollowCursor.value = false
  stateMachine.setState(State.IDLE)
}

/**
 * Trigger pat animation
 */
function pat(): void {
  if (!props.scripted) {
    return
  }
  isInfiniteEmote.value = false
  stateMachine.setState(State.PAT)
}

/**
 * Trigger right click animation
 */
function shy(): void {
  if (!props.scripted) {
    return
  }
  isInfiniteEmote.value = false
  stateMachine.setState(State.CLICK)
}

// Expose functions for parent component access
defineExpose({
  moveTo,
  sleep,
  emote,
  idle,
  pat,
  shy,
  setVolume,
})

// Lifecycle
onMounted(async () => {
  await initialize()
  await preloadSounds()

  if (config.value) {
    // Initialize canvas
    animation.initCanvas()

    // Start animation loop
    const frameRateLimitedTick = animation.createFrameRateLimitedTick(
      config.value.spriteMap.FrameRate,
      animationTick
    )
    animation.startAnimationLoop(frameRateLimitedTick)

    // Add global mouse tracking for cursor following (only in non-scripted mode)
    if (!props.scripted) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
    }

    // Start timers (only in non-scripted mode)
    if (!props.scripted) {
      resetIdleTimer()
      if (config.value.emoteConfig.AnnoyEmote) {
        resetEmoteTimer()
      }
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

.desktop-gremlin__message-box {
  position: absolute;
  bottom: 100%;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: white;
  border: 2px solid #333;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-family: sans-serif;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: auto;
  z-index: 1;
}

.desktop-gremlin__message-box::after {
  content: '';
  position: absolute;
  top: 100%;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 8px 6px 0 6px;
  border-color: #333 transparent transparent transparent;
}

.desktop-gremlin__message-box::before {
  content: '';
  position: absolute;
  top: 100%;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 6px 4px 0 4px;
  border-color: white transparent transparent transparent;
  margin-top: -1px;
}

.desktop-gremlin__message-box--left {
  right: 50%;
  transform: translateX(-10px);
}

.desktop-gremlin__message-box--left::after {
  right: 10px;
}

.desktop-gremlin__message-box--left::before {
  right: 12px;
}

.desktop-gremlin__message-box--right {
  left: 50%;
  transform: translateX(10px);
}

.desktop-gremlin__message-box--right::after {
  left: 10px;
}

.desktop-gremlin__message-box--right::before {
  left: 12px;
}
</style>
