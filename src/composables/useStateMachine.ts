import { ref, type Ref } from 'vue'
import { State, type CurrentFrames } from '@/types/states'
import type { CharacterConfig } from '@/types/character'

export interface StateMachineCallbacks {
  onStateChange?: (newState: State, oldState: State) => void
  onSoundPlay?: (soundFile: string) => void
  onResetIdleTimer?: () => void
  onResetEmoteTimer?: () => void
  onStartWalkIdleTimer?: () => void
  onStopWalkIdleTimer?: () => void
  onStartEmoteDurationTimer?: (duration: number) => void
  onStopEmoteDurationTimer?: () => void
}

export function useStateMachine(
  config: Ref<CharacterConfig | null>,
  callbacks: StateMachineCallbacks = {}
) {
  const currentState = ref<State>(State.INTRO)

  const currentFrames = ref<CurrentFrames>({
    Idle: 0,
    Hover: 0,
    Click: 0,
    Sleep: 0,
    Intro: 0,
    Outro: 0,
    Grab: 0,
    Up: 0,
    Down: 0,
    Left: 0,
    Right: 0,
    UpLeft: 0,
    UpRight: 0,
    DownLeft: 0,
    DownRight: 0,
    WalkIdle: 0,
    Pat: 0,
    Emote: 0,
  })

  /**
   * Resets frame counter for a specific state
   */
  function resetCurrentFrames(state: State): void {
    const frames = currentFrames.value
    switch (state) {
      case State.INTRO:
        frames.Intro = 0
        break
      case State.IDLE:
        frames.Idle = 0
        break
      case State.WALK_IDLE:
        frames.WalkIdle = 0
        break
      case State.HOVER:
        frames.Hover = 0
        break
      case State.WALKING:
        // Reset all walking direction frames
        frames.Up = 0
        frames.Down = 0
        frames.Left = 0
        frames.Right = 0
        frames.UpLeft = 0
        frames.UpRight = 0
        frames.DownLeft = 0
        frames.DownRight = 0
        break
      case State.DRAGGING:
        frames.Grab = 0
        break
      case State.CLICK:
        frames.Click = 0
        break
      case State.PAT:
        frames.Pat = 0
        break
      case State.EMOTE:
        frames.Emote = 0
        break
      case State.SLEEPING:
        frames.Sleep = 0
        break
      case State.OUTRO:
        frames.Outro = 0
        break
    }
  }

  /**
   * Sets a new state with proper side effects
   */
  function setState(newState: State): void {
    // Only trigger on actual state change
    if (currentState.value === newState) {
      return
    }

    const oldState = currentState.value

    // Handle timers on state exit
    if (oldState === State.WALK_IDLE) {
      callbacks.onStopWalkIdleTimer?.()
    }
    if (oldState === State.EMOTE) {
      callbacks.onStopEmoteDurationTimer?.()
    }

    // Handle sound effects on state entry
    switch (newState) {
      case State.DRAGGING:
        // Note: grab.wav not available in character assets
        // callbacks.onSoundPlay?.('grab.wav')
        break
      case State.WALKING:
        if (oldState !== State.WALKING) {
          callbacks.onSoundPlay?.('run.wav')
        }
        break
      case State.WALK_IDLE:
        callbacks.onStartWalkIdleTimer?.()
        break
      case State.CLICK:
        callbacks.onSoundPlay?.('mambo.wav')
        break
      case State.PAT:
        callbacks.onSoundPlay?.('pat.wav')
        break
      case State.EMOTE:
        callbacks.onSoundPlay?.('emote.wav')
        if (config.value) {
          const duration = config.value.emoteConfig.EmoteDuration
          callbacks.onStartEmoteDurationTimer?.(duration)
        }
        break
    }

    // Update state and reset frames
    currentState.value = newState
    resetCurrentFrames(newState)

    // Notify callback
    callbacks.onStateChange?.(newState, oldState)
  }

  /**
   * Transitions to IDLE or HOVER based on mouse position
   */
  function transitionToIdleOrHover(isMouseOver: boolean): void {
    setState(isMouseOver ? State.HOVER : State.IDLE)
  }

  return {
    currentState,
    currentFrames,
    setState,
    resetCurrentFrames,
    transitionToIdleOrHover,
  }
}
