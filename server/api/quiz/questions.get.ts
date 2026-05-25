import { readRange } from '~/server/utils/sheetsClient'
import { type Question } from '~/types/quiz'

function parseAnswerType(answerType: string): { id: string; text: string }[] {
  if (!answerType) return []
  return answerType
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const eq = s.indexOf('=')
      if (eq === -1) return { id: s, text: s }
      return { id: s.slice(0, eq).trim(), text: s.slice(eq + 1).trim() }
    })
}

export default defineEventHandler(async (): Promise<Question[]> => {
  const questionRows = await readRange('questions!A:C')  // id, questions, answertype

  const questions: Question[] = []
  for (const [id, text, answerType] of questionRows.slice(1)) {
    if (!id || !text) continue
    questions.push({ id, text, answers: parseAnswerType(answerType ?? '') })
  }

  return questions
})
