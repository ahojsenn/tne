import { ensureSheet, appendRows } from './sheetsClient'
import type { Question } from '~/types/quiz'

const SHEET = 'answers'

export async function logQuizResults(
  question: Question,
  votes: Record<string, number>,
): Promise<void> {
  try {
    await ensureSheet(SHEET)

    const totalVotes = Object.values(votes).reduce((s, n) => s + n, 0)
    const dateTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })

    // One column per answer option: "Developer: 3 (30%)"
    const answerCells = question.answers.map(a => {
      const count = votes[a.id] ?? 0
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      return `${a.text}: ${count} (${pct}%)`
    })

    const row = [dateTime, question.id, question.text, String(totalVotes), ...answerCells]
    await appendRows(`${SHEET}!A:Z`, [row])
    console.log(`[quizLogger] saved results for question "${question.id}" (${totalVotes} votes)`)
  } catch (err) {
    console.warn('[quizLogger] could not save quiz results to sheets:', err)
  }
}
