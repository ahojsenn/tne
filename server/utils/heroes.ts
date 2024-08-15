import originalHeroes from '~/types/heroes'
import { Effect } from "effect"
import { HERO_MESSAGE } from '~/types/message'

let replenishHeroeshowmanytimes = 0
let heroes = [...originalHeroes]
export const hero_hitlist = Effect.succeed([] as Array<HERO_MESSAGE>)
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
// by setting the throws array to an empty array
// and deleting heroes that are older than 12 hours
export const reset_hero_hitlist = (hl: Effect.Effect<HERO_MESSAGE[], never, never>) => {
  Effect.runSync(hl).forEach((h) => h.throws = [])
  Effect.runSync(hl).filter((h) => {
    const time = new Date().getTime() - new Date(h.joined).getTime()
    return time < 12 * 60 * 60 * 1000
  }) /**  */
}

// add hero to hitlist
export const add_hero = (clientId: string, hl: Array<HERO_MESSAGE>, threw?: string) => {
  // if hero is already in hitlist, return
  if (hl.find((h) => h.clientId === clientId)) return;
  // console.log('adding hero to hitlist', clientId, threw)
  const heroName = getHeroFromClientId(clientId);
  hl.push({
    clientId: clientId,
    hero: heroName,
    throws: threw ? [{ text: threw, number: 1 }] : [],
    joined: new Date()
  });
};

// get hero from clientid
export const getHeroFromClientId = (clientId: string): string => {
  //  const client = clients.find((c) => c.id === clientId)
  const client = Effect.runSync(hero_hitlist).find((c) => c.clientId === clientId)
  if (client) return client.hero
  // create a new hero if not found
  const heroName = getHero()
  Effect.runSync(hero_hitlist).push({
    clientId: clientId,
    hero: heroName,
    throws: [],
    joined: new Date()
  })
  return heroName
}

export const clientIdIsKnown = (s: string) => Effect.runSync(hero_hitlist).find((c) => c.clientId === s)

// find hero and add throw to the hero hitlist
export const add_throw = (clientId: string, hl: Array<HERO_MESSAGE>, threw: string) => {
  const heroName = getHeroFromClientId(clientId);
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
