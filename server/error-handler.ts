export default defineNitroErrorHandler((error, event) => {
  const url = event?.path ?? event?.node?.req?.url ?? 'unknown'
  const method = event?.node?.req?.method ?? '?'
  console.error(`[500] ${method} ${url} — ${error?.message ?? error}`)
  if (error?.stack) console.error(error.stack)

  // default JSON error response
  event.node.res.statusCode = error.statusCode ?? 500
  event.node.res.setHeader('Content-Type', 'application/json')
  event.node.res.end(JSON.stringify({
    url,
    statusCode: error.statusCode ?? 500,
    statusMessage: error.statusMessage ?? '',
    message: error.message ?? 'internal server error',
    stack: process.env.NODE_ENV !== 'production' ? error.stack : '',
  }))
})
