import { test, expect } from '@playwright/test'
import { handle_tne } from '../../server/utils/socketHandlers'
import { endTalk, startTalk } from '../../server/utils/talkStore'
import { messages, delete_all_messages } from '../../server/utils/messagesStore'

// Stateless: handle_tne is called directly with stand-ins for the socket and
// the io server. This is the only place the attribution rule is observable —
// the client never sends a talk id, so a browser test cannot show that one
// would be ignored.

function fakes() {
  const emitted: Array<{ event: string; payload: unknown }> = []
  const sink = { emit: (event: string, payload: unknown) => emitted.push({ event, payload }) }
  const socket = { emit: sink.emit } as any
  const global = {
    io: {
      to: () => sink,
      emit: sink.emit,
      sockets: { adapter: { rooms: new Map() } },
    },
  } as any
  return { socket, global, emitted }
}

test.beforeEach(() => {
  endTalk()
  delete_all_messages()
})

test.describe('throw attribution', () => {
  test('no active talk: the throw is stored without a talk id', () => {
    const { socket, global } = fakes()
    handle_tne(socket, global, { text: 'tomato', clientId: 'c1' })

    expect(messages).toHaveLength(1)
    expect(messages[0].text).toBe('tomato')
    expect(messages[0].talkId).toBeUndefined()
  })

  test('active talk: the throw is stamped with that talk', () => {
    const talk = startTalk({ email: 'a@test.example', displayName: 'A', heroName: 'Hero A' })

    const { socket, global } = fakes()
    handle_tne(socket, global, { text: 'egg', clientId: 'c1' })

    expect(messages[0].talkId).toBe(talk.id)
  })

  test('a talk id sent by the client is discarded, not trusted', () => {
    const talk = startTalk({ email: 'a@test.example', displayName: 'A', heroName: 'Hero A' })

    const { socket, global } = fakes()
    handle_tne(socket, global, { text: 'tomato', clientId: 'c1', talkId: 'somebody-elses-talk' })

    // Stamped from server state, never from the payload.
    expect(messages[0].talkId).toBe(talk.id)
  })

  test('a talk id sent while nobody is on stage is dropped', () => {
    const { socket, global } = fakes()
    handle_tne(socket, global, { text: 'tomato', clientId: 'c1', talkId: 'invented' })

    expect(messages[0].talkId).toBeUndefined()
  })

  test('the throw broadcast to catchup carries the same attribution', () => {
    const talk = startTalk({ email: 'a@test.example', displayName: 'A', heroName: 'Hero A' })

    const { socket, global, emitted } = fakes()
    handle_tne(socket, global, { text: 'star', clientId: 'c1', talkId: 'invented' })

    const catchup = emitted.find(e => e.event === 'catchup-event')
    expect(catchup).toBeTruthy()
    expect((catchup!.payload as { talkId?: string }).talkId).toBe(talk.id)
  })

  test('ending the talk stops attribution for later throws', () => {
    startTalk({ email: 'a@test.example', displayName: 'A', heroName: 'Hero A' })
    const { socket, global } = fakes()
    handle_tne(socket, global, { text: 'tomato', clientId: 'c1' })
    endTalk()
    handle_tne(socket, global, { text: 'tomato', clientId: 'c1' })

    expect(messages[0].talkId).toBeTruthy()
    expect(messages[1].talkId).toBeUndefined()
  })
})
