// Suppress EPIPE/ECONNRESET noise from clients that disconnect mid-response.
//
// Strategy: monkey-patch process.on/addListener/prependListener so that ANY
// handler registered for 'unhandledRejection' or 'uncaughtException' —
// including Nuxt's own handler, which is registered AFTER this plugin runs —
// automatically skips benign socket disconnect errors.
// This avoids the registration-order race that both "remove then re-add" and
// setImmediate approaches suffer from.

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

const FILTERED_EVENTS = new Set(['unhandledRejection', 'uncaughtException'])

function wrap(event: string | symbol, fn: Function): Function {
  if (!FILTERED_EVENTS.has(event as string)) return fn
  return function (this: any, ...args: any[]) {
    if (isExpectedSocketError(args[0])) return
    return fn.apply(this, args)
  }
}

export default defineNitroPlugin(() => {
  // Wrap currently-registered handlers (covers any registered before this plugin).
  for (const event of FILTERED_EVENTS) {
    const existing = process.rawListeners(event) as Function[]
    process.removeAllListeners(event)
    for (const h of existing) process.on(event as any, wrap(event, h) as any)
  }

  // Intercept future registrations so Nuxt's handlers (added after this plugin)
  // are also wrapped automatically.
  const _on = process.on.bind(process)
  const _add = process.addListener.bind(process)
  const _prepend = process.prependListener.bind(process)

  ;(process as any).on = (ev: any, fn: any) => _on(ev, wrap(ev, fn) as any)
  ;(process as any).addListener = (ev: any, fn: any) => _add(ev, wrap(ev, fn) as any)
  ;(process as any).prependListener = (ev: any, fn: any) => _prepend(ev, wrap(ev, fn) as any)
})
