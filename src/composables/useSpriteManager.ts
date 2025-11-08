import { ref, type Ref } from 'vue'
import type { CharacterName, CharacterConfig } from '@/types/character'

// Import all character configs using Vite's glob import
const spriteMapModules = import.meta.glob<{ default: any }>(
  '../assets/characters/*/sprite-map.json',
  { eager: true }
)
const frameCountModules = import.meta.glob<{ default: any }>(
  '../assets/characters/*/frame-count.json',
  { eager: true }
)
const emoteConfigModules = import.meta.glob<{ default: any }>(
  '../assets/characters/*/emote-config.json',
  { eager: true }
)

// Import all sprite images (lazy loaded to create separate chunks)
const spriteModules = import.meta.glob<string>(
  '../assets/characters/*/*.png',
  { eager: false, import: 'default', query: '?url' }
)

/**
 * Cache for loaded sprite images
 */
const spriteCache = new Map<string, HTMLImageElement>()

/**
 * Cache for loaded character configurations
 */
const configCache = new Map<CharacterName, CharacterConfig>()

export function useSpriteManager(characterName: Ref<CharacterName>) {
  const config = ref<CharacterConfig | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Gets the URL for a sprite file (async because of lazy loading)
   */
  async function getSpriteUrl(character: CharacterName, fileName: string): Promise<string> {
    const path = `../assets/characters/${character}/${fileName}`

    for (const [key, loader] of Object.entries(spriteModules)) {
      if (key.includes(`/${character}/${fileName}`)) {
        const url = await loader()
        return url as string
      }
    }

    throw new Error(`Sprite not found: ${path}`)
  }

  /**
   * Loads a sprite image from the assets
   */
  async function loadSprite(
    character: CharacterName,
    fileName: string
  ): Promise<HTMLImageElement> {
    const cacheKey = `${character}/${fileName}`

    // Return cached sprite if available
    if (spriteCache.has(cacheKey)) {
      return spriteCache.get(cacheKey)!
    }

    // Load new sprite
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        spriteCache.set(cacheKey, img)
        resolve(img)
      }

      img.onerror = () => {
        reject(new Error(`Failed to load sprite: ${cacheKey}`))
      }

      getSpriteUrl(character, fileName)
        .then(url => {
          img.src = url
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  /**
   * Loads character configuration (sprite-map, frame-count, emote-config)
   */
  async function loadCharacterConfig(
    character: CharacterName
  ): Promise<CharacterConfig> {
    // Return cached config if available
    if (configCache.has(character)) {
      return configCache.get(character)!
    }

    try {
      // Find the config modules for this character
      const spriteMapKey = Object.keys(spriteMapModules).find(key =>
        key.includes(`/${character}/sprite-map.json`)
      )
      const frameCountKey = Object.keys(frameCountModules).find(key =>
        key.includes(`/${character}/frame-count.json`)
      )
      const emoteConfigKey = Object.keys(emoteConfigModules).find(key =>
        key.includes(`/${character}/emote-config.json`)
      )

      if (!spriteMapKey || !frameCountKey || !emoteConfigKey) {
        throw new Error(`Configuration files not found for character: ${character}`)
      }

      const characterConfig: CharacterConfig = {
        spriteMap: spriteMapModules[spriteMapKey].default,
        frameCount: frameCountModules[frameCountKey].default,
        emoteConfig: emoteConfigModules[emoteConfigKey].default,
      }

      configCache.set(character, characterConfig)
      return characterConfig
    } catch (err) {
      throw new Error(
        `Failed to load configuration for character: ${character}. ${err}`
      )
    }
  }

  /**
   * Gets a sprite from the cache, or loads it if not cached
   */
  async function getSprite(fileName: string): Promise<HTMLImageElement | null> {
    if (!config.value) return null

    try {
      return await loadSprite(characterName.value, fileName)
    } catch (err) {
      console.error('Error loading sprite:', err)
      return null
    }
  }

  /**
   * Preloads all sprites for a character
   */
  async function preloadAllSprites(character: CharacterName): Promise<void> {
    const cfg = await loadCharacterConfig(character)

    const spriteFiles = [
      cfg.spriteMap.Idle,
      cfg.spriteMap.Hover,
      cfg.spriteMap.Click,
      cfg.spriteMap.Sleep,
      cfg.spriteMap.Intro,
      cfg.spriteMap.Outro,
      cfg.spriteMap.Grab,
      cfg.spriteMap.Up,
      cfg.spriteMap.Down,
      cfg.spriteMap.Left,
      cfg.spriteMap.Right,
      cfg.spriteMap.UpLeft,
      cfg.spriteMap.UpRight,
      cfg.spriteMap.DownLeft,
      cfg.spriteMap.DownRight,
      cfg.spriteMap.WalkIdle,
      cfg.spriteMap.Pat,
      cfg.spriteMap.Emote,
    ]

    // Remove duplicates
    const uniqueFiles = [...new Set(spriteFiles)]

    // Load all sprites in parallel
    await Promise.all(uniqueFiles.map((file) => loadSprite(character, file)))
  }

  /**
   * Initializes the sprite manager by loading config and preloading sprites
   */
  async function initialize(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      config.value = await loadCharacterConfig(characterName.value)
      await preloadAllSprites(characterName.value)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error('Failed to initialize sprite manager:', error.value)
    } finally {
      loading.value = false
    }
  }

  /**
   * Clears the sprite cache
   */
  function clearCache(): void {
    spriteCache.clear()
  }

  return {
    config,
    loading,
    error,
    getSprite,
    loadCharacterConfig,
    preloadAllSprites,
    initialize,
    clearCache,
  }
}
