import { defineStore } from 'pinia'
import type { ThrownItem } from '~/types/thrownItem'
import { type Client } from '~/types/client'
import type { HERO_MESSAGE } from '~/types/message'
import type { GAME } from '~/types/gameModes'
type THROWS = { thing: string, number: number }

export const useClientStore = defineStore('client', {
  state: () => ({
    client: { hero: 'unknown', id: 'unknown', clientStr: 'unknown', nr: 0 } as Client,
    throws: [] as THROWS[], // array of thrown items
    heroes: [] as HERO_MESSAGE[],
    last_game_heroes: [] as HERO_MESSAGE[],
    gameSettings: { ison: false, difficulty: 5, aim: 300 } as GAME,
  }),
  actions: {
    reset() {
      //this.client = { hero: 'unknown', id: 'unknown', clientStr: 'unknown', nr: 0 }
      this.throws = []
    },
    reset_last_game_heroes() {
      this.last_game_heroes = []
    },
    storeThrow(thing: string) { // Add the 'thing' parameter
      const existingThrow = this.throws.find((t) => t.thing === thing)
      if (existingThrow) {
        existingThrow.number++
      } else
        this.throws.push({ thing, number: 1 })
    },
    // store cliend data
    storeClient(client: Client) {
      this.client = client
      console.log('client stored: %s', this.client.hero)
    },
    // store last_game_heroes 
    storeLastGameHeroes(heroes: HERO_MESSAGE[]) {
      this.last_game_heroes = heroes
    },
    setGameSettings(settings: GAME) {
      this.gameSettings = settings
    }
  },
  getters: {
    getHero: (state): string => state.client.hero,
    getThrows: (state): THROWS[] => state.throws,
    getNumberOfThrows: (state): number => state.throws.reduce((acc, t) => acc + t.number, 0),
    getNumberOfThrowsOf: (state) => {
      return (thing: string) => state.throws.find((t) => t.thing === thing)?.number || 0
    },
    getHeroes: (state): HERO_MESSAGE[] => state.heroes,
    getTrolls: (state): HERO_MESSAGE[] => state.heroes.filter((h) => h.throws.filter(t => t.text != 'tomato').length > 0),
    getTrollsLastGame: (state): HERO_MESSAGE[] => state.last_game_heroes.filter((h) => h.throws.filter(t => t.text != 'tomato').length > 0),
    getGameSettings: (state) => state.gameSettings,
  },
})

export const useGameStore = defineStore('game', {
  state: () => ({
    gameMode: false,
  }),
  actions: {
    on() { this.gameMode = true },
    off() { this.gameMode = false },
    toggle() { this.gameMode = !this.isOn },
    set(value: boolean) { this.gameMode = value },
  },
  getters: {
    isOn: (state): boolean => state.gameMode,
  },
})

export const useThrownItemsStore = defineStore('thrownItems', {
  state: () => {
    return { thrownItems: [] as ThrownItem[] }
  },
  actions: {
    throw(item: ThrownItem) {
      // console.log('in store.throw: %s was thrown', item.x)
      setTimeout((self) => self.delete(item), 5000, this)
      this.thrownItems.push(item)
    },
    delete(item: ThrownItem) {
      this.thrownItems = this.thrownItems.filter((i) => i.rnd !== item.rnd)
    }
  }
})