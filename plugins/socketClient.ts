import { io } from 'socket.io-client';

export default defineNuxtPlugin(async (nuxtApp) => {
  return {
    provide: {
      io: io()
    }
  }
});