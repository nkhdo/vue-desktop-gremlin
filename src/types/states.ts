/**
 * Gremlin animation states
 */
export enum State {
  INTRO = 'INTRO',
  IDLE = 'IDLE',
  HOVER = 'HOVER',
  WALKING = 'WALKING',
  WALK_IDLE = 'WALK_IDLE',
  DRAGGING = 'DRAGGING',
  CLICK = 'CLICK',
  PAT = 'PAT',
  SLEEPING = 'SLEEPING',
  OUTRO = 'OUTRO',
  EMOTE = 'EMOTE',
}

/**
 * Direction for walking animations
 */
export type Direction =
  | 'Up'
  | 'Down'
  | 'Left'
  | 'Right'
  | 'UpLeft'
  | 'UpRight'
  | 'DownLeft'
  | 'DownRight'

/**
 * Current frame indices for all animations
 */
export interface CurrentFrames {
  Idle: number
  Hover: number
  Click: number
  Sleep: number
  Intro: number
  Outro: number
  Grab: number
  Up: number
  Down: number
  Left: number
  Right: number
  UpLeft: number
  UpRight: number
  DownLeft: number
  DownRight: number
  WalkIdle: number
  Pat: number
  Emote: number
}
