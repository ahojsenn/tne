import { useThrownItemsStore } from '~/store/useThrownItemsStore'

export default defineNuxtPlugin(({ $pinia }) => {
  return {
    provide: {
      store: useThrownItemsStore($pinia)
    }
  }
})