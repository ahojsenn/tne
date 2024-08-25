import type { HERO_MESSAGE, SCORE, THROW } from "~/types/message";

export const useClientHeroStore = defineStore('clientHero', {
  state: () => ({
    hero: { clientId: '', heroName: '', throws: [] as THROW[], joined: new Date, h_m_s: { hits: 0, misses: 0, score: 0 } } as HERO_MESSAGE,
  }),
  actions: {
    newHero(heroName: string) {
      this.hero = { clientId: '', heroName: heroName, throws: [], joined: new Date, h_m_s: { hits: 0, misses: 0, score: 0 } }
    },
    reset_hero() {
      this.hero = { clientId: '', heroName: '', throws: [], joined: new Date, h_m_s: { hits: 0, misses: 0, score: 0 } }
    },
    storeHero(hero: HERO_MESSAGE) {
      this.hero = hero;
      console.log('hero stored: %s', hero, this.hero);
    },
    setScore(h_m_s: SCORE) {
      this.hero.h_m_s = h_m_s  // set the score
      console.log('useClientHeroScore.setScore: ', this.hero)
    },
    storeThrow(thing: string) {
      const existingThrow = this.hero.throws.find((t) => t.text === thing);
      if (existingThrow) {
        existingThrow.number++;
      }
      else
        this.hero.throws.push({ text: thing, number: 1 });
    }
  }, // end of actions
  getters: {
    getHeroName: (state): string => state.hero.heroName,
    getHeroScore: (state): number => state.hero.h_m_s.score,
    getHeroHits: (state): number => state.hero.h_m_s.hits,
    getHeroMisses: (state): number => state.hero.h_m_s.misses,
    getHeroh_m_s: (state): { hits: number, misses: number, score: number } => state.hero.h_m_s,
    getHero: (state): HERO_MESSAGE => state.hero,
    getNumberOfThrowsOf: (state) => {
      return (thing: string) => state.hero.throws.find((t) => t.text === thing)?.number || 0;
    },
    getNumberOfThrows: (state): number => state.hero.h_m_s.hits + state.hero.h_m_s.misses
  }, // end of getters
})  // end of useClientStore