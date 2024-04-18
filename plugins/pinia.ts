import { useThrownItemsStore } from '~/store'

export default defineNuxtPlugin(({ $pinia }) => {
  return {
    provide: {
      store: useThrownItemsStore($pinia)
    }
  }
})