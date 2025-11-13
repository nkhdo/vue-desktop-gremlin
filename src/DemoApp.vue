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
      <div class="volume-control">
        <label for="input-volume">Volume: {{ Math.round(volume * 100) }}%</label>
        <input
          id="input-volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          v-model.number="volume"
        />
      </div>
      <div class="debug-selector">
        <input id="input-debug" type="checkbox" v-model="debug" />
        <label for="input-debug">Debug</label>
      </div>
      <div class="debug-selector">
        <input id="input-scripted" type="checkbox" v-model="scripted" />
        <label for="input-scripted">Scripted</label>
      </div>
      <div class="message-box-controls">
        <h3>Message Box:</h3>
        <div class="debug-selector">
          <input id="show-message" type="checkbox" v-model="showMessage" />
          <label for="show-message">Show Message</label>
        </div>
        <div v-if="showMessage" class="message-input">
          <label for="message-text">Message:</label>
          <input id="message-text" type="text" v-model="messageText" placeholder="Type a message..." />
        </div>
        <div v-if="showMessage" class="position-selector">
          <label>Position:</label>
          <button
            @click="messagePosition = 'left'"
            :class="{ active: messagePosition === 'left' }"
          >
            Left
          </button>
          <button
            @click="messagePosition = 'right'"
            :class="{ active: messagePosition === 'right' }"
          >
            Right
          </button>
        </div>
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
    ref="gremlin"
    :key="character"
    :character="character"
    :debug="debug"
    :scripted="scripted"
    :volume="volume"
    :show-speech-bubble="showMessage"
    :speech-bubble-position="messagePosition"
    v-model:position="position"
  >
    <template #speech>
      {{ messageText }}
    </template>
  </DesktopGremlin>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import DesktopGremlin from './components/DesktopGremlin.vue'
import type { CharacterName } from './types/character'

const gremlinRef = useTemplateRef('gremlin')
const character = ref<CharacterName>('mambo')
const debug = ref(false)
const scripted = ref(false)
const volume = ref(0.8)
const showMessage = ref(false)
const messageText = ref('Hello! 👋')
const messagePosition = ref<'left' | 'right'>('right')

const position = ref({ x: 100, y: 100 })

function changeCharacter(newCharacter: CharacterName) {
  character.value = newCharacter
}

onMounted(() => {
  window.gremlin = gremlinRef.value
})
</script>

<style scoped>
.volume-control {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.volume-control label {
  font-weight: 500;
}

.volume-control input[type="range"] {
  width: 100%;
  cursor: pointer;
}

.message-box-controls {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
}

.message-box-controls h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.message-input {
  margin: 0.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.message-input label {
  font-weight: 500;
  font-size: 0.9rem;
}

.message-input input[type="text"] {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.position-selector {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.position-selector label {
  font-weight: 500;
  font-size: 0.9rem;
}

.position-selector button {
  padding: 0.4rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.position-selector button:hover {
  background: #f5f5f5;
}

.position-selector button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}
</style>
