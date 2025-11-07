import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { State } from '@/types/states'
import type { CharacterConfig } from '@/types/character'

export interface AnimationCallbacks {
  onAnimationComplete?: (state: State) => void
}

export function useAnimation(
  config: Ref<CharacterConfig | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  callbacks: AnimationCallbacks = {}
) {
  const ctx = ref<CanvasRenderingContext2D | null>(null)
  const animationFrameId = ref<number | null>(null)

  /**
   * Initializes the canvas context
   */
  function initCanvas(): void {
    if (!canvasRef.value) {
      console.error('Canvas ref is null!')
      return
    }
    ctx.value = canvasRef.value.getContext('2d')
    console.log('Canvas context initialized:', ctx.value)
  }

  /**
   * Extracts and renders a single frame from a spritesheet
   */
  function renderFrame(
    sprite: HTMLImageElement,
    currentFrame: number,
    frameCount: number
  ): number {
    if (!ctx.value || !config.value || !canvasRef.value) {
      return currentFrame
    }

    const { SpriteColumn, FrameWidth, FrameHeight } = config.value.spriteMap

    // Calculate frame position in spritesheet
    const col = currentFrame % SpriteColumn
    const row = Math.floor(currentFrame / SpriteColumn)
    const x = col * FrameWidth
    const y = row * FrameHeight

    // Check bounds
    if (x + FrameWidth > sprite.width || y + FrameHeight > sprite.height) {
      console.warn('Animation frame out of bounds')
      return (currentFrame + 1) % frameCount
    }

    // Clear canvas
    ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

    // Draw the frame
    ctx.value.drawImage(
      sprite,
      x,
      y,
      FrameWidth,
      FrameHeight,
      0,
      0,
      FrameWidth,
      FrameHeight
    )

    // Return next frame index
    return (currentFrame + 1) % frameCount
  }

  /**
   * Plays an animation sequence
   */
  async function playAnimation(
    state: State,
    currentFrame: number,
    spriteFileName: string,
    frameCount: number,
    getSprite: (fileName: string) => Promise<HTMLImageElement | null>
  ): Promise<number> {
    if (frameCount === 0) {
      console.warn('Frame count is 0 for', spriteFileName)
      return currentFrame
    }

    const sprite = await getSprite(spriteFileName)
    if (!sprite) {
      console.warn('Sprite not loaded:', spriteFileName)
      return currentFrame
    }

    const nextFrame = renderFrame(sprite, currentFrame, frameCount)

    // Check if animation completed (looped back to 0)
    if (nextFrame === 0 && currentFrame !== 0) {
      callbacks.onAnimationComplete?.(state)
    }

    return nextFrame
  }

  /**
   * Starts the animation loop
   */
  function startAnimationLoop(
    animationTick: (deltaTime: number) => void
  ): void {
    let lastTime = performance.now()

    const loop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      animationTick(deltaTime)

      animationFrameId.value = requestAnimationFrame(loop)
    }

    animationFrameId.value = requestAnimationFrame(loop)
  }

  /**
   * Stops the animation loop
   */
  function stopAnimationLoop(): void {
    if (animationFrameId.value !== null) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
  }

  /**
   * Creates a frame-rate limited animation tick
   */
  function createFrameRateLimitedTick(
    frameRate: number,
    tick: () => void
  ): (deltaTime: number) => void {
    const frameInterval = 1000 / frameRate
    let accumulator = 0

    return (deltaTime: number) => {
      accumulator += deltaTime

      // Run tick for each frame interval that has passed
      while (accumulator >= frameInterval) {
        tick()
        accumulator -= frameInterval
      }
    }
  }

  onMounted(() => {
    initCanvas()
  })

  onUnmounted(() => {
    stopAnimationLoop()
  })

  return {
    ctx,
    renderFrame,
    playAnimation,
    startAnimationLoop,
    stopAnimationLoop,
    createFrameRateLimitedTick,
    initCanvas,
  }
}
