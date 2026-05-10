// nuxt.config.ts


// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-10',
  ssr: false,
  nitro: {
    experimental: {
      websocket: true
    }
  },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/device',
  ],
  devtools: { enabled: false },
  css: [
    "vuetify/lib/styles/main.sass",
    "@mdi/font/css/materialdesignicons.css",
    "vuetify/styles",
  ],
  vite: {
    css: {
      preprocessorOptions: {
        sass: { api: 'modern-compiler' },
        scss: { api: 'modern-compiler' },
      },
    },
    // @ts-ignore
    // curently this will lead to a type error, but hopefully will be fixed soon #justBetaThings
    ssr: {
      noExternal: ['vuetify'], // add the vuetify vite plugin
    },
  },
  app: {
    head: {
      titleTemplate: '%s - tomatoes-and-eggs',
      title: 'tomatoes-and-eggs',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { hid: 'description', name: 'description', content: '' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },
  build: {
    transpile: ['vuetify'],
  }
})
