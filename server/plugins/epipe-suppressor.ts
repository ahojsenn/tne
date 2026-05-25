// Suppress EPIPE/ECONNRESET noise from clients that disconnect mid-handshake.
// Runs as a Nitro plugin so it fires AFTER Nuxt/Nitro register their own
// unhandledRejection handlers — our handler replaces all of them.
function isExpectedSocketError(reason: any): boolean {
  if (!reason) return false
  const code = reason.code ?? ''
  const msg: string = reason.message ?? String(reason)
  return (
    code === 'EPIPE' ||
    code === 'ECONNRESET' ||
    code === 'ECONNABORTED' ||
    msg.includes('EPIPE') ||
    msg.includes('ECONNRESET') ||
    msg.includes('write after end') ||
    msg.includes('read ECONNRESET')
  )
}

export default defineNitroPlugin(() => {
  process.removeAllListeners('unhandledRejection')
  process.on('unhandledRejection', (reason: any) => {
    if (isExpectedSocketError(reason)) return
    console.error('[unhandledRejection]', reason)
  })
})
