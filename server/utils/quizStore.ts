import { type Question } from '~/types/quiz'

let _activeQuestion: Question | null = null

export function setActiveQuestion(q: Question | null): void {
  _activeQuestion = q
}

export function getActiveQuestion(): Question | null {
  return _activeQuestion
}
