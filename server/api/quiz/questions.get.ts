import { readRange } from '~/server/utils/sheetsClient'
import { type Question } from '~/types/quiz'

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
}

function parseAnswerType(answerType: string): { answers: { id: string; text: string }[]; starRating?: number } {
  if (!answerType) return { answers: [] }

  // Star rating format: "0-N" → generates N+1 options (0 … N)
  const starMatch = answerType.trim().match(/^0-(\d+)$/)
  if (starMatch) {
    const max = parseInt(starMatch[1])
    const answers = Array.from({ length: max + 1 }, (_, i) => ({ id: String(i), text: String(i) }))
    return { answers, starRating: max }
  }

  const answers = answerType
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const eq = s.indexOf('=')
      if (eq === -1) return { id: s, text: decodeHtmlEntities(s) }
      return { id: s.slice(0, eq).trim(), text: decodeHtmlEntities(s.slice(eq + 1).trim()) }
    })
  return { answers }
}

export default defineEventHandler(async (): Promise<Question[]> => {
  const questionRows = await readRange('questions!A:C')  // id, questions, answertype

  const questions: Question[] = []
  for (const [id, text, answerType] of questionRows.slice(1)) {
    if (!id || !text) continue
    const { answers, starRating } = parseAnswerType(answerType ?? '')
    questions.push({ id, text: decodeHtmlEntities(text), answers, ...(starRating !== undefined ? { starRating } : {}) })
  }

  return questions
})
