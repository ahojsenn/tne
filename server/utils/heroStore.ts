import originalHeroes from '~/types/heroes'
import { Effect } from "effect"
import { HERO_MESSAGE } from '~/types/message'

let replenishHeroeshowmanytimes = 0
let heroes = [...originalHeroes]
export let hero_hitlist = Effect.succeed([] as Array<HERO_MESSAGE>)
export const last_game_hero_hitlist = Effect.succeed([] as Array<HERO_MESSAGE>)


// replenish heroes by resetting the array to the originalHeroes
// and add -replenishHeroes to the replenishHeroes strings
export const replenishHeroes = () => {
  heroes = [...originalHeroes.map((h) => h + '-' + replenishHeroeshowmanytimes)]
  replenishHeroeshowmanytimes++
  console.log('replenishing heroes')
}

// return a random superhero that is not yet taken in clients
// and if it is taken, try add a "1" or ++ to the name and try again
export const getHero = (): string => {
  if (heroes.length === 0) replenishHeroes();
  // pick a random hero from the list
  const hero = heroes[Math.floor(Math.random() * heroes.length)];
  // remove the new used hero from the heroes list
  heroes = heroes.filter((h) => h !== hero);
  return hero;
};

// reset hero hitlist
// by resetting the hero_hitlist 
// and getting each connected client to resent their client-id
export const reset_hero_hitlist = (hl: Effect.Effect<HERO_MESSAGE[], never, never>) => {
  Effect.runSync(hl).map((h) => {
    h.throws = []
    h.h_m_s = { hits: 0, misses: 0, score: 0 }
  })
  console.log('reset_hero_hitlist: resetting hero_hitlist', JSON.stringify(hl))
}

// set hero_hitlist scores to zero
export const reset_hero_scores = (hl: Array<HERO_MESSAGE>) => {
  hl.map((heromsg) => heromsg.h_m_s = { hits: 0, misses: 0, score: 0 })
}

export const reset_hero_score = (heroName: string, hl: Array<HERO_MESSAGE>) => {
  const hero = hl.find((h) => h.heroName === heroName)
  if (hero) hero.h_m_s = { hits: 0, misses: 0, score: 0 }
}

// add hero to hitlist
export const add_hero = (clientId: string, hl: Array<HERO_MESSAGE>, threw?: string) => {
  // if hero is already in hitlist, return
  if (hl.find((h) => h.clientId === clientId)) return;
  // console.log('adding hero to hitlist', clientId, threw)
  hl.push({
    clientId: clientId,
    heroName: getHeroFromClientId(clientId).heroName,
    throws: threw ? [{ text: threw, number: 1 }] : [],
    joined: new Date(),
    h_m_s: { hits: 0, misses: 0, score: 0 }
  });
};

// get hero from clientid
export const getHeroFromClientId = (clientId: string): HERO_MESSAGE => {
  //  const client = clients.find((c) => c.id === clientId)
  const client = Effect.runSync(hero_hitlist).find((c) => c.clientId === clientId)
  if (client) return client
  // create a new hero if not found
  const hero = {
    clientId: clientId,
    heroName: getHero(),
    throws: [],
    joined: new Date(),
    h_m_s: { hits: 0, misses: 0, score: 0 }
  }
  Effect.runSync(hero_hitlist).push(hero)
  return hero
}

export const clientIdIsKnown = (s: string) => Effect.runSync(hero_hitlist).find((c) => c.clientId === s)

// find hero and add throw to the hero hitlist
export const add_throw = (clientId: string, hl: Array<HERO_MESSAGE>, threw: string) => {
  const heroName = getHeroFromClientId(clientId).heroName;
  if (!heroName) add_hero(clientId, hl, threw);
  // find hero in hero_hitlist *Attention*
  const hero = hl.find((h) => h.clientId === clientId);
  // add throw to hero
  if (!hero) {
    add_hero(clientId, hl, threw);
    console.log("WARNING: in socket.ts.add_throw: added hero ", heroName, clientId, threw, hl);
    return;
  }
  // check, if hero has thrown that thing before...
  const existingThrow = hero.throws.find((t) => t.text === threw);
  if (existingThrow) {
    existingThrow.number++;
  }
  else
    hero.throws.push({ text: threw, number: 1 });
};
