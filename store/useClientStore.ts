import { string } from "effect/Equivalence";
import { defineStore } from "pinia";
import LastThrownItems from "~/components/stats/lastThrownItems.vue";
import type { Client } from "~/types/client";
import type { GAME } from "~/types/gameModes";
import type { HERO_MESSAGE, SCORE, THROW_MESSAGE } from "~/types/message";

export type THROWS = { thing: string, number: number }

export const useClientStore = defineStore('client', {
  state: () => ({
    client: { hero: 'unknown', id: 'unknown', clientStr: 'unknown', nr: 0 } as Client,
    tomatoGameScore: { "hits": 0, "misses": 0, "score": 0 },
    throws: [] as THROWS[], // array of thrown items
    heroes: [] as HERO_MESSAGE[],
    last_game_heroes: [] as HERO_MESSAGE[],
    gameSettings: { ison: false, difficulty: 5, aim: 300 } as GAME,
    LastThrownItem: '',
  }),
  actions: {
    reset_heroes() {
      // reset the heroes
      this.heroes = [];
    },
    reset_throws() {
      // reset the throws
      this.throws = [];
    },
    reset_last_game_heroes() {
      this.last_game_heroes = [];
    },
    reset_tomatoGameScore() {
      this.tomatoGameScore = { "hits": 0, "misses": 0, "score": 0 }
    },
    storeThrow(thing: string) {
      this.LastThrownItem = thing
      const existingThrow = this.throws.find((t) => t.thing === thing);
      if (existingThrow) {
        existingThrow.number++;
      }
      else
        this.throws.push({ thing, number: 1 });
    },
    // store cliend data
    storeClient(client: Client) {
      this.client = client;
      // add the new hero to the heroes list
      this.heroes.push({
        clientId: client.id,
        heroName: client.hero,
        throws: [],
        joined: new Date,
        h_m_s: { hits: 0, misses: 0, score: 0 }
      });
      console.log('client stored: %s', this.client.hero);
    },
    // store last_game_heroes 
    storeLastGameHeroes(heroes: HERO_MESSAGE[]) {
      this.last_game_heroes = heroes;
    },
    setScore(score: SCORE) {
      this.tomatoGameScore = score  // set the score
    },
    setGameSettings(settings: GAME) {
      this.gameSettings = settings;
    },
    calculate_score(data: THROW_MESSAGE) {
      if (data.text === 'tomato') this.tomatoGameScore.hits++
      else this.tomatoGameScore.misses++
      this.tomatoGameScore.score = this.tomatoGameScore.hits - this.gameSettings.difficulty * this.tomatoGameScore.misses
    }
  },
  getters: {
    getLastThrownItem: (state): string => state.LastThrownItem, // last thrown item
    getHero: (state): string => state.client.hero,
    getThrows: (state): THROWS[] => state.throws,
    getNumberOfThrows: (state): number => state.throws.reduce((acc, t) => acc + t.number, 0),
    getNumberOfThrowsOf: (state) => {
      return (thing: string) => state.throws.find((t) => t.thing === thing)?.number || 0;
    },
    getScore: (state): number => state.tomatoGameScore.score,
    getHeroes: (state): HERO_MESSAGE[] => state.heroes,
    getTrolls: (state): HERO_MESSAGE[] => state.heroes.filter((h) => h.throws.filter(t => t.text != 'tomato').length > 0),
    getTrollsLastGame: (state): HERO_MESSAGE[] => state.last_game_heroes.filter((h) => h.throws.filter(t => t.text != 'tomato').length > 0),
    getGameSettings: (state) => state.gameSettings,
  },
});
