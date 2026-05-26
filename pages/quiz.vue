<template lang="pug">
div
  //- Password gate
  .auth-gate(v-if="!authenticated")
    .auth-card
      h2 🎯 Quiz
      input.auth-input(
        v-model="password"
        type="password"
        placeholder="Password"
        :disabled="checking"
        @keyup.enter="login"
        autofocus
      )
      p.auth-error(v-if="error") {{ error }}
      button.auth-btn(:disabled="checking" @click="login") {{ checking ? '…' : 'Enter' }}

  //- Quiz console
  .quiz-console(v-if="authenticated")
    h1 🎯 Quiz Console

    .console-layout
      .left-panel
        p.status(v-if="activeQuestion")
          | Active: 
          strong {{ activeQuestion.text }}
          button.deactivate-btn(@click="activateQuestion(null)") ✕ Deactivate
        p.status.none(v-else) No active question

        .loading(v-if="loading") Loading questions…
        .error-msg(v-if="fetchError") {{ fetchError }}

        .question-list(v-if="!loading")
          .question-card(
            v-for="q in questions"
            :key="q.id"
            :class="{ active: activeQuestion?.id === q.id }"
            @click="activateQuestion(q)"
          )
            .question-text {{ q.text }}
            .answers
              span.answer(v-for="a in q.answers" :key="a.id") {{ a.text }}

        //- Add new question form
        .add-question-form
          button.toggle-form-btn(@click="showForm = !showForm") {{ showForm ? '▲ Cancel' : '＋ New Question' }}
          transition(name="form-fade")
            .form-body(v-if="showForm")
              label Question
              input.form-input(v-model="newQuestion" placeholder="How often...?" @keyup.enter="saveQuestion")
              label Answer options
              input.form-input(
                v-model="newAnswerType"
                placeholder="daily/weekly/never"
              )
              p.form-hint Format: Option A/Option B/Option C or 0-5 for star rating
              p.form-error(v-if="formError") {{ formError }}
              button.save-btn(:disabled="saving" @click="saveQuestion") {{ saving ? 'Saving…' : 'Save' }}

      .right-panel
        //- QR code (inline, not floating)
        .qr-section
          p.qr-label Scan to answer:
          .qr-inline
            qrcode(path="answer")

        //- Answer options + live vote results (shown as soon as question is active)
        .vote-results(v-if="activeQuestion")
          p.vote-title {{ totalVotes > 0 ? `Live results (${totalVotes} votes)` : 'Answer options' }}
          .vote-bar(v-for="a in activeQuestion.answers" :key="a.id")
            .bar-track
              .bar-fill(:style="{ width: votePercent(a.id) + '%' }")
              .bar-label {{ a.text }}{{ votes[a.id] ? ` · ${votes[a.id]} (${votePercent(a.id)}%)` : '' }}
          .star-stats(v-if="activeQuestion.starRating !== undefined && totalVotes > 0")
            span.stat-item ⌀ {{ starAverage.toFixed(2) }}
            span.stat-sep &nbsp;·&nbsp;
            span.stat-item RMS {{ starRms.toFixed(2) }}
</template>

<script setup lang="ts">
import { type Question } from '~/types/quiz'

const { $io } = useNuxtApp()

// --- Auth ---
const authenticated = ref(false)
const password = ref('')
const error = ref('')
const checking = ref(false)

onMounted(() => {
  if (sessionStorage.getItem('tne-console-auth') === '1') {
    authenticated.value = true
    fetchQuestions()
  }
})

async function login() {
  if (!password.value) return
  error.value = ''
  checking.value = true
  try {
    await $fetch('/api/auth/verify', {
      method: 'POST',
      body: { password: password.value },
    })
    sessionStorage.setItem('tne-console-auth', '1')
    authenticated.value = true
    fetchQuestions()
  } catch (e: any) {
    error.value = e?.data?.statusMessage === 'Wrong password'
      ? 'Wrong password, try again.'
      : 'Could not verify — please retry.'
  } finally {
    checking.value = false
    password.value = ''
  }
}

// --- Questions ---
const questions = ref<Question[]>([])
const activeQuestion = ref<Question | null>(null)
const loading = ref(false)
const fetchError = ref('')

async function fetchQuestions() {
  loading.value = true
  fetchError.value = ''
  try {
    questions.value = await $fetch<Question[]>('/api/quiz/questions')
  } catch (e: any) {
    fetchError.value = 'Could not load questions from Google Sheets.'
  } finally {
    loading.value = false
  }
}

function activateQuestion(q: Question | null) {
  activeQuestion.value = q
  votes.value = {}
  $io.emit('activate-question', q)
}

// --- Add question form ---
const showForm = ref(false)
const newQuestion = ref('')
const newAnswerType = ref('')
const saving = ref(false)
const formError = ref('')

async function saveQuestion() {
  if (!newQuestion.value.trim()) return
  saving.value = true
  formError.value = ''
  try {
    await $fetch('/api/quiz/questions', {
      method: 'POST',
      body: { question: newQuestion.value, answerType: newAnswerType.value },
    })
    newQuestion.value = ''
    newAnswerType.value = ''
    showForm.value = false
    await fetchQuestions()
  } catch (e: any) {
    formError.value = 'Save failed — please try again.'
  } finally {
    saving.value = false
  }
}

// --- Votes ---
const votes = ref<Record<string, number>>({})
const totalVotes = computed(() => Object.values(votes.value).reduce((s, n) => s + n, 0))

function votePercent(answerId: string): number {
  if (!totalVotes.value) return 0
  return Math.round(((votes.value[answerId] ?? 0) / totalVotes.value) * 100)
}

const starAverage = computed(() => {
  if (!activeQuestion.value || totalVotes.value === 0) return 0
  let sum = 0
  for (const a of activeQuestion.value.answers) {
    sum += parseInt(a.id) * (votes.value[a.id] ?? 0)
  }
  return sum / totalVotes.value
})

const starRms = computed(() => {
  if (!activeQuestion.value || totalVotes.value === 0) return 0
  let sumSq = 0
  for (const a of activeQuestion.value.answers) {
    const val = parseInt(a.id)
    sumSq += val * val * (votes.value[a.id] ?? 0)
  }
  return Math.sqrt(sumSq / totalVotes.value)
})

onMounted(() => {
  $io.on('quiz-vote-update', ({ questionId, votes: v }: { questionId: string; votes: Record<string, number> }) => {
    if (activeQuestion.value?.id === questionId) votes.value = v
  })
})
</script>

<style scoped lang="scss">
.quiz-console {
  color: white;
  font-family: 'Lucida Console', 'Courier New', monospace;
  padding: 20px;

  h1 { margin-bottom: 16px; }
}

.console-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.left-panel { flex: 1; min-width: 0; }

.right-panel {
  width: 280px;
  flex-shrink: 0;
}

.qr-section {
  margin-bottom: 24px;
  .qr-label {
    font-size: 0.85em;
    color: #aaa;
    margin-bottom: 1em;
  }
  .qr-inline {
    position: relative;
    width: 256px;
    height: 256px;
  }
}

.vote-results {
  .vote-title {
    font-size: 0.85em;
    color: greenyellow;
    margin-bottom: 10px;
  }
}

.star-stats {
  margin-top: 12px;
  font-size: 0.85em;
  color: greenyellow;
  display: flex;
  align-items: center;

  .stat-item { font-weight: bold; }
  .stat-sep { color: #555; }
}

.vote-bar {
  margin-bottom: 6px;

  .bar-track {
    position: relative;
    background: #2a2a2a;
    border-radius: 4px;
    height: 22px;
    overflow: hidden;
  }

  .bar-fill {
    background: greenyellow;
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 4px;
  }

  .bar-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    padding: 0 8px;
    font-size: 0.78em;
    color: white;
    mix-blend-mode: difference;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }
}

.status {
  margin-bottom: 16px;
  font-size: 0.9em;
  color: greenyellow;
  &.none { color: #888; }
}

.deactivate-btn {
  margin-left: 12px;
  font-size: 0.8em;
  padding: 2px 8px;
  background: #555;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover { background: #c0392b; }
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 700px;
}

.question-card {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 14px 18px;
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover { border-color: greenyellow; }
  &.active { border-color: greenyellow; background: #1a2e1a; }
}

.question-text {
  font-size: 1em;
  margin-bottom: 8px;
}

.answers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.answer {
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 0.8em;
  color: #ccc;
}

.loading, .error-msg { color: #888; font-size: 0.9em; }
.error-msg { color: #ff6b6b; }

.add-question-form {
  margin-top: 20px;
  max-width: 700px;
}

.toggle-form-btn {
  background: #2a2a2a;
  border: 1px solid #555;
  color: greenyellow;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  &:hover { border-color: greenyellow; }
}

.form-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;

  label {
    font-size: 0.8em;
    color: #aaa;
    margin-bottom: 2px;
  }
}

.form-input {
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.95em;
  padding: 8px 10px;
  width: 100%;
  box-sizing: border-box;
  &:focus { outline: 2px solid greenyellow; border-color: greenyellow; }
}

.form-hint {
  font-size: 0.75em;
  color: #666;
  margin: 0;
}

.form-error {
  font-size: 0.8em;
  color: #ff6b6b;
  margin: 0;
}

.save-btn {
  background: greenyellow;
  color: black;
  border: none;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.95em;
  padding: 8px 16px;
  cursor: pointer;
  align-self: flex-start;
  margin-top: 4px;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #aaff00; }
}

.form-fade-enter-active,
.form-fade-leave-active { transition: opacity 0.2s ease; }
.form-fade-enter-from,
.form-fade-leave-to { opacity: 0; }

// Auth gate (shared with gameconsole)
.auth-gate {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-card {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 10px;
  padding: 32px;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-family: 'Courier New', Courier, monospace;
  color: white;

  h2 { margin: 0; font-size: 1.2em; }
}
.auth-input {
  background: #2a2a2a;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-family: 'Courier New', Courier, monospace;
  font-size: 1em;
  padding: 10px;
  width: 100%;
  box-sizing: border-box;
  &:focus { outline: 2px solid greenyellow; border-color: greenyellow; }
}
.auth-error { color: #ff6b6b; margin: 0; font-size: 0.85em; }
.auth-btn { width: 100%; padding: 10px; font-size: 1em; }
</style>
