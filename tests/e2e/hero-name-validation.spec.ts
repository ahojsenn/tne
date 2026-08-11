import { test, expect } from '@playwright/test'
import {
  HERO_NAME_MAX_LENGTH,
  HERO_NAME_MIN_LENGTH,
  validateHeroName,
} from '../../types/heroName'
import superheroes from '../../types/heroes'

// Pure validator tests — no browser, no server, no Google Sheets. The rules
// live in one place precisely so they can be checked like this, without
// dragging in the stateful speaker-account flow.

test.describe('hero name validation', () => {
  test('accepts a personal name that is not in the suggestion list', () => {
    const check = validateHeroName('Captain Kommitment')
    expect(check.ok).toBe(true)
    expect(superheroes).not.toContain('Captain Kommitment')
    if (check.ok) expect(check.value).toBe('Captain Kommitment')
  })

  test('trims surrounding whitespace before storing', () => {
    const check = validateHeroName('   Doctor Deploy \n ')
    expect(check.ok).toBe(true)
    if (check.ok) expect(check.value).toBe('Doctor Deploy')
  })

  test('length boundaries are inclusive', () => {
    expect(validateHeroName('a'.repeat(HERO_NAME_MIN_LENGTH)).ok).toBe(true)
    expect(validateHeroName('a'.repeat(HERO_NAME_MAX_LENGTH)).ok).toBe(true)
  })

  test('rejects one character below the minimum', () => {
    const check = validateHeroName('a'.repeat(HERO_NAME_MIN_LENGTH - 1))
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.message).toMatch(/at least 2/)
  })

  test('rejects one character above the maximum', () => {
    const check = validateHeroName('a'.repeat(HERO_NAME_MAX_LENGTH + 1))
    expect(check.ok).toBe(false)
    if (!check.ok) expect(check.message).toMatch(/at most 23/)
  })

  test('length is measured after trimming, not before', () => {
    // 23 characters plus padding — must still be accepted.
    expect(validateHeroName(`  ${'a'.repeat(HERO_NAME_MAX_LENGTH)}  `).ok).toBe(true)
    // Whitespace alone is not a name.
    expect(validateHeroName('     ').ok).toBe(false)
  })

  test('rejects empty and non-string input', () => {
    for (const bad of ['', undefined, null, 42, {}, []]) {
      expect(validateHeroName(bad).ok, `${JSON.stringify(bad)} must be rejected`).toBe(false)
    }
  })

  test('every suggested hero is still a valid choice', () => {
    // The old implementation only allowed names from this list; the new rules
    // must not accidentally exclude any of them.
    for (const hero of superheroes) {
      expect(validateHeroName(hero).ok, `${hero} must remain valid`).toBe(true)
    }
  })
})
