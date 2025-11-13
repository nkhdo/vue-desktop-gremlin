<template>
  <div class="container">
    <h1>🎮 Desktop Gremlin Vue Component Demo</h1>
    <p>
      An animated desktop pet component for Vue 3. The gremlin is rendered with
      Teleport to document.body and can move freely across the entire viewport!
    </p>

    <div class="controls">
      <h2>Select Character:</h2>
      <div class="character-selector">
        <button
          @click="changeCharacter('mambo')"
          :class="{ active: character === 'mambo' }"
        >
          Mambo (Matikanetannhauser)
        </button>
        <button
          @click="changeCharacter('rice-shower')"
          :class="{ active: character === 'rice-shower' }"
        >
          Rice Shower
        </button>
      </div>
      <div class="debug-selector">
        <input id="input-debug" type="checkbox" v-model="debug" />
        <label for="input-debug">Debug</label>
      </div>
    </div>

    <div class="instructions">
      <h3>How to Interact:</h3>
      <ul>
        <li><strong>Drag & Drop:</strong> Click and drag the gremlin to move it around</li>
        <li><strong>Right-Click:</strong> Triggers a special animation (Mambo time!)</li>
        <li><strong>Head Pat:</strong> Click the top of the gremlin's head to pat it</li>
        <li><strong>Cursor Following:</strong> Right-click the gremlin and it will follow your cursor</li>
        <li><strong>Idle States:</strong> Leave it alone for 5 minutes and watch it sleep</li>
        <li><strong>Random Emotes:</strong> The gremlin will occasionally emote on its own</li>
      </ul>
      <p><em>Note: Sound will be enabled after your first interaction!</em></p>
    </div>

    <div class="instructions">
      Current position: ({{ position.x }}, {{ position.y }})
    </div>
  </div>


  <!-- The gremlin component -->
  <DesktopGremlin
    :key="character"
    :character="character"
    :debug="debug"
    v-model:position="position"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DesktopGremlin from './components/DesktopGremlin.vue'
import type { CharacterName } from './types/character'

const character = ref<CharacterName>('mambo')
const debug = ref(false)

const position = ref({ x: 100, y: 100 })

function changeCharacter(newCharacter: CharacterName) {
  character.value = newCharacter
}
</script>
