import { ref, type Ref } from 'vue'
import type { CharacterName } from '@/types/character'

/**
 * Sound cache and playback manager
 */
const soundCache = new Map<string, HTMLAudioElement>()
const lastPlayed = new Map<string, number>()

export function useSoundManager(characterName: Ref<CharacterName>) {
  const soundEnabled = ref(false)
  const volume = ref(0.8)

  /**
   * Loads a sound file
   */
  async function loadSound(
    character: CharacterName,
    fileName: string
  ): Promise<HTMLAudioElement> {
    const cacheKey = `${character}/${fileName}`

    // Return cached sound if available
    if (soundCache.has(cacheKey)) {
      return soundCache.get(cacheKey)!
    }

    // Create new audio element
    const audio = new Audio()

    try {
      // Use dynamic import for sound files
      audio.src = new URL(
        `../assets/characters/${character}/sounds/${fileName}`,
        import.meta.url
      ).href
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
      const audio = await loadSound(characterName.value, fileName)

      // Clone the audio for simultaneous playback
      const playInstance = audio.cloneNode(true) as HTMLAudioElement
      playInstance.volume = volume.value

      await playInstance.play()
      lastPlayed.set(cacheKey, Date.now())
    } catch (err) {
      console.error(`Error playing sound ${fileName}:`, err)
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
  async function preloadSounds(character: CharacterName): Promise<void> {
    const soundFiles = [
      'intro.wav',
      'run.wav',
      'mambo.wav',
      'pat.wav',
      'emote.wav',
    ]

    await Promise.allSettled(
      soundFiles.map((file) => loadSound(character, file))
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
