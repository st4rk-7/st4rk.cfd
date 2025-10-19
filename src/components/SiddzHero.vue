<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const tags = [
  'Embedded Systems Tinkerer',
  'Hardware Engineer',
  'Electronics Explorer',
  'Firmware Developer',
]

const currentIndex = ref(0)
let interval: ReturnType<typeof setInterval>

onMounted(() => {
  interval = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % tags.length
  }, 3000)
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<template>
  <div class="hero-section flex items-center gap-4 mb-6 mt-4">
    <img
      src="/avatar.png"
      alt="Sanjeew Shewon"
      class="hero-avatar"
    />
    <div class="flex-1 min-w-0">
      <h1 class="hero-name">
        Sanjeew Shewon
      </h1>
      <div class="hero-tagline">
        <div class="morph-container">
          <!-- Hidden width reservers: all tags stacked so container fits the widest -->
          <span
            v-for="(tag, i) in tags"
            :key="'reserve-' + i"
            class="morph-reserve"
            aria-hidden="true"
          >{{ tag }}</span>

          <TransitionGroup name="morph">
            <span
              v-for="(tag, i) in tags"
              v-show="currentIndex === i"
              :key="'tag-' + i"
              class="morph-active"
            >
              <span
                v-for="(char, ci) in tag.split('')"
                :key="i + '-' + ci"
                class="morph-char"
                :style="{ '--char-index': ci }"
              >{{ char === ' ' ? '\u00A0' : char }}</span>
            </span>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-section {
  font-family: 'Geist Sans', 'Inter', system-ui, sans-serif;
}

.hero-avatar {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  object-fit: cover;
  border: 1px solid rgba(136, 136, 136, 0.25);
  flex-shrink: 0;
}

@media (min-width: 640px) {
  .hero-avatar {
    width: 64px;
    height: 64px;
  }
}

.hero-name {
  font-family: 'Geist Sans', 'Inter', system-ui, sans-serif;
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  margin: 0;
  padding: 0;
  border: none;
  color: #1a1a1a;
}

html.dark .hero-name {
  color: #f0f0f0;
}

@media (min-width: 640px) {
  .hero-name {
    font-size: 2rem;
  }
}

.hero-tagline {
  font-family: 'Geist Sans', 'Inter', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: #a1a1aa;
  margin-top: 2px;
}

@media (min-width: 640px) {
  .hero-tagline {
    font-size: 15px;
  }
}

.morph-container {
  display: inline-grid;
  align-items: baseline;
}

/* All reserves and active occupy the same grid cell */
.morph-reserve,
.morph-active {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  display: block;
  white-space: nowrap;
}

.morph-reserve {
  visibility: hidden;
  pointer-events: none;
}

.morph-active {
  display: flex;
}

.morph-char {
  display: inline-block;
  white-space: pre;
  opacity: 1;
  filter: blur(0px);
}

/* Vue Transition Classes for Enter and Leave */
.morph-enter-active .morph-char {
  transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--char-index) * 20ms);
}

.morph-leave-active .morph-char {
  transition: opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  /* Reverse the stagger when leaving to look more natural */
  transition-delay: calc(var(--char-index) * 10ms);
}

.morph-enter-from .morph-char {
  opacity: 0;
  filter: blur(6px);
}

.morph-leave-to .morph-char {
  opacity: 0;
  filter: blur(6px);
}
</style>
