<template lang="pug">
teleport(to="body")
  transition(name="overlay-fade")
    .quiz-overlay(v-if="activeQuestion")
      .overlay-card

        .question-text {{ activeQuestion.text }}

        template(v-if="!voted")
          .answer-buttons(v-if="!activeQuestion.starRating")
            button.answer-btn(
              v-for="a in activeQuestion.answers"
              :key="a.id"
              @click="submitAnswer(a.id)"
            ) {{ a.text }}
          .star-section(v-else)
            .star-row
              span.star(
                v-for="a in activeQuestion.answers.filter(a => Number(a.id) > 0)"
                :key="a.id"
                :class="{ lit: Number(a.id) <= (hoveredStar ?? selectedStar ?? 0) }"
                @mouseenter="hoveredStar = Number(a.id)"
                @mouseleave="hoveredStar = null"
                @click="selectedStar = Number(a.id)"
              ) ★
            button.send-btn(:disabled="selectedStar === null" @click="selectedStar !== null && submitAnswer(String(selectedStar))") Send

        .confirmation(v-else)
          .confirmation-icon ✅
          p Thanks for your answer!
</template>

<script setup lang="ts">
import { type Question } from '~/types/quiz'

const { $io } = useNuxtApp()

const activeQuestion = ref<Question | null>(null)
const voted = ref(false)
const hoveredStar = ref<number | null>(null)
const selectedStar = ref<number | null>(null)

onMounted(() => {
  $io.on('active-question', (q: Question | null) => {
    activeQuestion.value = q
    voted.value = false
    selectedStar.value = null
  })
  $io.emit('get-active-question')
})

function submitAnswer(answerId: string) {
  if (!activeQuestion.value || voted.value) return
  $io.emit('submit-answer', { questionId: activeQuestion.value.id, answerId })
  voted.value = true
  setTimeout(() => { activeQuestion.value = null }, 3000)
}
</script>

<style scoped lang="scss">
.quiz-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.overlay-card {
  background: #111;
  border: 2px solid greenyellow;
  border-radius: 12px;
  padding: 28px 24px;
  max-width: 520px;
  width: 100%;
  font-family: 'Courier New', Courier, monospace;
  color: white;
}

.question-text {
  font-size: 1.2em;
  color: greenyellow;
  margin-bottom: 20px;
  text-align: center;
  line-height: 1.4;
}

.answer-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-btn {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 8px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.05em;
  padding: 14px 18px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 0.15s, background 0.15s;

  &:hover { border-color: greenyellow; background: #1a2e1a; }
  &:active { background: greenyellow; color: black; }
}

.star-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 6px;
  padding: 12px 0;
}

.star {
  font-size: 2.8em;
  cursor: pointer;
  color: #444;
  transition: color 0.1s, transform 0.12s;
  user-select: none;
  line-height: 1;

  &.lit { color: gold; }
  &:hover { transform: scale(1.25); }
}

.star-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.send-btn {
  background: greenyellow;
  color: black;
  border: none;
  border-radius: 6px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1em;
  padding: 10px 28px;
  cursor: pointer;
  transition: background 0.15s;

  &:disabled { opacity: 0.35; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #aaff00; }
}

.confirmation {
  text-align: center;
  padding: 10px 0;

  .confirmation-icon { font-size: 2.5em; margin-bottom: 10px; }
  p { color: #aaa; font-size: 1em; }
}

.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.25s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0; }
</style>
