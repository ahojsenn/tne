import { readRange, appendRows } from '~/server/utils/sheetsClient'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { question?: string; answerType?: string }
  if (!body?.question?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'question required' })
  }

  // Generate a simple id from timestamp
  const id = `q${Date.now()}`

  // Find the next free row by counting existing rows
  await appendRows('questions!A:C', [[id, body.question.trim(), body.answerType?.trim() ?? '']])

  return { ok: true, id }
})
