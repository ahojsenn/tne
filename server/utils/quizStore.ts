import { type Question } from '~/types/quiz'

let _activeQuestion: Question | null = null
// votes: { [questionId]: { [answerId]: count } }
const _votes: Record<string, Record<string, number>> = {}

export function setActiveQuestion(q: Question | null): void {
  _activeQuestion = q
  // reset votes for the new question
  if (q) _votes[q.id] = {}
}

export function getActiveQuestion(): Question | null {
  return _activeQuestion
}

export function recordVote(questionId: string, answerId: string): void {
  if (!_votes[questionId]) _votes[questionId] = {}
  _votes[questionId][answerId] = (_votes[questionId][answerId] ?? 0) + 1
}

export function getVotes(questionId: string): Record<string, number> {
  return _votes[questionId] ?? {}
}
