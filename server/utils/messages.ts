import { THROW_MESSAGE } from "~/types/message"

export const messages = [] as Array<THROW_MESSAGE>

export const add_to_messages = (m: THROW_MESSAGE) => {
  messages.push(m)
  if (messages.length > 2000) messages.shift()
}

export const delete_all_messages = () => messages.splice(0, messages.length)

export const limit_messages = () => { if (messages.length > 2000) messages.shift() }
