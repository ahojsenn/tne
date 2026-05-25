import { loadConfig, getConfig } from '../../utils/configStore'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { password?: string }
  if (!body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'password required' })
  }
  // Use cached config if available; otherwise try to load with a short timeout
  let config = getConfig()
  if (!config) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('config not ready')), 8000)
    )
    config = await Promise.race([loadConfig(), timeout]).catch(() => null)
  }
  if (!config?.adminPasswd) {
    throw createError({ statusCode: 503, statusMessage: 'Config not available — retry in a moment' })
  }
  if (body.password !== config.adminPasswd) {
    throw createError({ statusCode: 401, statusMessage: 'Wrong password' })
  }
  return { ok: true }
})
