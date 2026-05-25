import { readRange } from '~/server/utils/sheetsClient'
import { type Question } from '~/types/quiz'

export default defineEventHandler(async (): Promise<Question[]> => {
  const [questionRows, answerRows] = await Promise.all([
    readRange('questions!A:C'),  // id, questions, answertype
    readRange('answers!A:C'),    // answertype, answer_id, answer_text
  ])

  // Build answer map: answertype -> [{id, text}]
  const answerMap: Record<string, { id: string; text: string }[]> = {}
  for (const [answerType, answerId, answerText] of answerRows.slice(1)) {
    if (!answerType || !answerId || !answerText) continue
    if (!answerMap[answerType]) answerMap[answerType] = []
    answerMap[answerType].push({ id: answerId, text: answerText })
  }

  // Build questions list — join on answertype
  const questions: Question[] = []
  for (const [id, text, answerType] of questionRows.slice(1)) {
    if (!id || !text) continue
    questions.push({ id, text, answers: answerMap[answerType] ?? [] })
  }

  return questions
})
