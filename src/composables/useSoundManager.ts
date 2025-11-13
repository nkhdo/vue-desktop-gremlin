import { ref, type Ref } from 'vue'
import type { CharacterName } from '@/types/character'

// Import all sound files using Vite's glob import (lazy loaded to create separate chunks)
const soundModules = import.meta.glob<string>(
  '../assets/characters/*/sounds/*.wav',
  { eager: false, import: 'default', query: '?url' }
)

/**
 * Sound cache and playback manager
 */
const soundCache = new Map<string, HTMLAudioElement>()
const lastPlayed = new Map<string, number>()

export interface SoundManagerOptions {
  initialVolume?: number
}

export function useSoundManager(characterName: Ref<CharacterName>, options: SoundManagerOptions = {}) {
  const soundEnabled = ref(false)
  const volume = ref(options.initialVolume ?? 0.8)

  /**
   * Gets the URL for a sound file (async because of lazy loading)
   */
  async function getSoundUrl(character: CharacterName, fileName: string): Promise<string> {
    for (const [key, loader] of Object.entries(soundModules)) {
      if (key.includes(`/${character}/sounds/${fileName}`)) {
        const url = await loader()
        return url as string
      }
    }
    throw new Error(`Sound not found: ${character}/sounds/${fileName}`)
  }

  /**
   * Loads a sound file
   */
  async function loadSound(
    fileName: string
  ): Promise<HTMLAudioElement> {
    const cacheKey = `${characterName.value}/${fileName}`

    // Return cached sound if available
    if (soundCache.has(cacheKey)) {
      return soundCache.get(cacheKey)!
    }

    // Create new audio element
    const audio = new Audio()

    try {
      const url = await getSoundUrl(characterName.value, fileName)
      audio.src = url
      audio.volume = volume.value

      // Preload the audio
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true })
        audio.addEventListener('error', () => reject(new Error(`Failed to load sound: ${cacheKey}`)), { once: true })
        audio.load()
      })

      soundCache.set(cacheKey, audio)
      return audio
    } catch (err) {
      console.error(`Error loading sound ${cacheKey}:`, err)
      throw err
    }
  }

  /**
   * Plays a sound with optional delay-based rate limiting
   */
  async function playSound(fileName: string, delaySeconds: number = 0): Promise<void> {
    if (!soundEnabled.value) {
      return
    }

    const cacheKey = `${characterName.value}/${fileName}`

    // Check rate limiting
    if (delaySeconds > 0) {
      const lastTime = lastPlayed.get(cacheKey)
      if (lastTime) {
        const elapsed = (Date.now() - lastTime) / 1000
        if (elapsed < delaySeconds) {
          return
        }
      }
    }

    try {
      const audio = await loadSound(fileName)

      // Clone the audio for simultaneous playback
      const playInstance = audio.cloneNode(true) as HTMLAudioElement
      playInstance.volume = volume.value

      await playInstance.play()
      lastPlayed.set(cacheKey, Date.now())
    } catch (err) {
      // Silently fail for missing sound files - they're optional
      // console.warn(`Sound file not available: ${fileName}`)
    }
  }

  /**
   * Enables sound (call after first user interaction)
   */
  function enableSound(): void {
    soundEnabled.value = true
  }

  /**
   * Sets the volume for all sounds
   */
  function setVolume(newVolume: number): void {
    volume.value = Math.max(0, Math.min(1, newVolume))
  }

  /**
   * Preloads all sound files for a character
   */
  async function preloadSounds(): Promise<void> {
    const soundFiles = [
      'intro.wav',
      'run.wav',
      'mambo.wav',
      'pat.wav',
      'emote.wav',
    ]

    await Promise.allSettled(
      soundFiles.map((file) => loadSound(file))
    )
  }

  return {
    soundEnabled,
    volume,
    playSound,
    enableSound,
    setVolume,
    preloadSounds,
  }
}
