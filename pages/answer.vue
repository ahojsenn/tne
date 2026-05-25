<template lang="pug">
div.answer-page
  //- Waiting
  .waiting(v-if="!activeQuestion")
    .waiting-icon ⏳
    p Waiting for a question…

  //- Question + answer buttons
  .question-view(v-else-if="!voted")
    .question-text {{ activeQuestion.text }}
    .answer-buttons
      button.answer-btn(
        v-for="a in activeQuestion.answers"
        :key="a.id"
        @click="submitAnswer(a.id)"
      ) {{ a.text }}

  //- Confirmation
  .confirmation(v-else)
    .confirmation-icon ✅
    p Your answer was recorded!
    p.hint Waiting for results…
</template>

<script setup lang="ts">
import { type Question } from '~/types/quiz'

const { $io } = useNuxtApp()

const activeQuestion = ref<Question | null>(null)
const voted = ref(false)

onMounted(() => {
  $io.on('active-question', (q: Question | null) => {
    activeQuestion.value = q
    voted.value = false
  })
  // Request current active question in case it was set before this page loaded
  $io.emit('get-active-question')
})

function submitAnswer(answerId: string) {
  if (!activeQuestion.value || voted.value) return
  $io.emit('submit-answer', { questionId: activeQuestion.value.id, answerId })
  voted.value = true
}
</script>

<style scoped lang="scss">
.answer-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: 'Lucida Console', 'Courier New', monospace;
  color: white;
  padding: 20px;
  box-sizing: border-box;
}

.waiting, .confirmation {
  text-align: center;

  .waiting-icon, .confirmation-icon {
    font-size: 3em;
    margin-bottom: 16px;
  }

  p {
    font-size: 1.1em;
    color: #aaa;
    margin: 6px 0;
  }

  .hint { font-size: 0.85em; color: #666; }
}

.question-view {
  max-width: 600px;
  width: 100%;
}

.question-text {
  font-size: 1.3em;
  margin-bottom: 24px;
  line-height: 1.4;
  color: greenyellow;
  text-align: center;
}

.answer-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.answer-btn {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 8px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.05em;
  padding: 14px 20px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
  width: 100%;

  &:hover {
    border-color: greenyellow;
    background: #1a2e1a;
  }

  &:active {
    background: greenyellow;
    color: black;
  }
}
</style>
