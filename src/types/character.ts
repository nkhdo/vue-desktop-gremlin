/**
 * Sprite map configuration - maps animation states to sprite file names
 */
export interface SpriteMapConfig {
  FrameRate: number
  SpriteColumn: number
  FrameHeight: number
  FrameWidth: number
  TopHotspotHeight: number
  TopHotspotWidth: number
  Idle: string
  Hover: string
  Click: string
  Sleep: string
  Intro: string
  Outro: string
  Grab: string
  Up: string
  Down: string
  Left: string
  Right: string
  UpLeft: string
  UpRight: string
  DownLeft: string
  DownRight: string
  WalkIdle: string
  Pat: string
  Emote: string
}

/**
 * Frame count configuration - number of frames per animation
 */
export interface FrameCountConfig {
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

/**
 * Emote configuration - controls random emote behavior
 */
export interface EmoteConfig {
  AnnoyEmote: boolean
  MinEmoteTriggerMinutes: number
  MaxEmoteTriggerMinutes: number
  EmoteDuration: number
}

/**
 * Character configuration bundle
 */
export interface CharacterConfig {
  spriteMap: SpriteMapConfig
  frameCount: FrameCountConfig
  emoteConfig: EmoteConfig
}

/**
 * Available character names
 */
export type CharacterName = 'mambo' | 'rice-shower'

/**
 * Position in 2D space
 */
export interface Position {
  x: number
  y: number
}

/**
 * Velocity vector
 */
export interface Velocity {
  x: number
  y: number
}
