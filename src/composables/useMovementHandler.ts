import { ref } from 'vue'
import type { Position, Velocity } from '@/types/character'
import type { Direction } from '@/types/states'

export interface MovementOptions {
  followRadius?: number
  moveSpeed?: number
}

export function useMovementHandler(options: MovementOptions = {}) {
  const followRadius = options.followRadius ?? 150
  const moveSpeed = options.moveSpeed ?? 5

  const position = ref<Position>({ x: 100, y: 100 })
  const velocity = ref<Velocity>({ x: 0, y: 0 })
  const isDragging = ref(false)
  const dragOffset = ref<Position>({ x: 0, y: 0 })
  const mousePosition = ref<Position>({ x: 0, y: 0 })
  const isMouseOver = ref(false)

  /**
   * Updates cursor position for following behavior
   */
  function updateMousePosition(x: number, y: number): void {
    mousePosition.value = { x, y }
  }

  /**
   * Calculates velocity to follow the cursor
   */
  function calculateFollowVelocity(): Velocity {
    if (!isMouseOver.value) {
      return { x: 0, y: 0 }
    }

    const dx = mousePosition.value.x - position.value.x
    const dy = mousePosition.value.y - position.value.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Only follow if outside the follow radius
    if (distance <= followRadius) {
      return { x: 0, y: 0 }
    }

    // Calculate normalized direction
    const dirX = dx / distance
    const dirY = dy / distance

    return {
      x: dirX * moveSpeed,
      y: dirY * moveSpeed,
    }
  }

  /**
   * Gets the animation direction based on velocity
   */
  function getAnimationDirection(): Direction | null {
    const vx = velocity.value.x
    const vy = velocity.value.y

    if (vx === 0 && vy === 0) {
      return null
    }

    let vertical = ''
    let horizontal = ''

    if (vy < 0) vertical = 'Up'
    else if (vy > 0) vertical = 'Down'

    if (vx < 0) horizontal = 'Left'
    else if (vx > 0) horizontal = 'Right'

    return (vertical + horizontal) as Direction
  }

  /**
   * Starts dragging
   */
  function startDrag(mouseX: number, mouseY: number): void {
    isDragging.value = true
    dragOffset.value = {
      x: mouseX - position.value.x,
      y: mouseY - position.value.y,
    }
  }

  /**
   * Updates position during drag
   */
  function updateDrag(mouseX: number, mouseY: number): void {
    if (!isDragging.value) return

    position.value = {
      x: mouseX - dragOffset.value.x,
      y: mouseY - dragOffset.value.y,
    }
  }

  /**
   * Stops dragging
   */
  function stopDrag(): void {
    isDragging.value = false
  }

  /**
   * Updates position based on velocity
   */
  function updatePosition(): void {
    if (isDragging.value) return

    // Update velocity for cursor following
    velocity.value = calculateFollowVelocity()

    // Update position
    if (velocity.value.x !== 0 || velocity.value.y !== 0) {
      position.value = {
        x: position.value.x + velocity.value.x,
        y: position.value.y + velocity.value.y,
      }
    }
  }

  /**
   * Sets mouse over state
   */
  function setMouseOver(over: boolean): void {
    isMouseOver.value = over
  }

  /**
   * Checks if currently moving
   */
  function isMoving(): boolean {
    return velocity.value.x !== 0 || velocity.value.y !== 0
  }

  return {
    position,
    velocity,
    isDragging,
    isMouseOver,
    mousePosition,
    updateMousePosition,
    calculateFollowVelocity,
    getAnimationDirection,
    startDrag,
    updateDrag,
    stopDrag,
    updatePosition,
    setMouseOver,
    isMoving,
  }
}
