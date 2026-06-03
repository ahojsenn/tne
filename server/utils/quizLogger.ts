import { ensureSheet, appendRows } from './sheetsClient'
import type { Question } from '~/types/quiz'

const SHEET = 'answers'

export async function logQuizResults(
  question: Question,
  votes: Record<string, number>,
): Promise<void> {
  try {
    const isNew = await ensureSheet(SHEET)
    if (isNew) {
      await appendRows(`${SHEET}!A:G`, [['event', 'question_id', 'question_text', 'total_votes', 'results', 'average', 'rms']])
    }

    const totalVotes = Object.values(votes).reduce((s, n) => s + n, 0)
    const dateTime = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })

    // All answer options in one cell: "Developer: 3 (30%) / QA: 5 (50%) / PO: 2 (20%)"
    const answerCell = question.answers.map(a => {
      const count = votes[a.id] ?? 0
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
      return `${a.text}: ${count} (${pct}%)`
    }).join(' / ')

    // For star-rating questions, compute average and RMS
    let avgCell = ''
    let rmsCell = ''
    if (question.starRating !== undefined && totalVotes > 0) {
      let sumVal = 0
      let sumSq = 0
      for (const a of question.answers) {
        const val = parseInt(a.id)
        const count = votes[a.id] ?? 0
        sumVal += val * count
        sumSq += val * val * count
      }
      const avg = sumVal / totalVotes
      const rms = Math.sqrt(sumSq / totalVotes)
      avgCell = avg.toFixed(2)
      rmsCell = rms.toFixed(2)
    }

    const row = [dateTime, question.id, question.text, String(totalVotes), answerCell, avgCell, rmsCell]
    await appendRows(`${SHEET}!A:G`, [row])
    console.log(`[quizLogger] saved results for question "${question.id}" (${totalVotes} votes)`)
  } catch (err) {
    console.warn('[quizLogger] could not save quiz results to sheets:', err)
  }
}
