import { readRange } from '~/server/utils/sheetsClient'
import { type Question } from '~/types/quiz'

export default defineEventHandler(async (): Promise<Question[]> => {
  const [questionRows, answerRows] = await Promise.all([
    readRange('questions!A:B'),
    readRange('answers!A:C'),
  ])

  // Build answer map: question_id -> [{id, text}]
  const answerMap: Record<string, { id: string; text: string }[]> = {}
  for (const [questionId, answerId, answerText] of answerRows.slice(1)) {
    if (!questionId || !answerId || !answerText) continue
    if (!answerMap[questionId]) answerMap[questionId] = []
    answerMap[questionId].push({ id: answerId, text: answerText })
  }

  // Build questions list
  const questions: Question[] = []
  for (const [id, text] of questionRows.slice(1)) {
    if (!id || !text) continue
    questions.push({ id, text, answers: answerMap[id] ?? [] })
  }

  return questions
})
