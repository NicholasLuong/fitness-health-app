import { describe, expect, it } from 'vitest'
import { buildChatGPTPrompt, createFreshItems, effectiveFreshState, matchDishes, normalizeIngredient, parseFreshBatch } from './kitchen'
import type { Dish } from './types'

describe('kitchen helpers', () => {
  it('parses dictated batches across supported separators', () => {
    expect(parseFreshBatch('Spinach, mushrooms; chicken thighs\nSpinach')).toEqual(['Spinach', 'mushrooms', 'chicken thighs'])
  })

  it('moves an item to use soon after seven days', () => {
    const items = createFreshItems('Spinach', new Date('2026-09-01T12:00:00Z'), 7)
    expect(effectiveFreshState(items[0], new Date('2026-09-08T11:59:00Z'))).toBe('recent')
    expect(effectiveFreshState(items[0], new Date('2026-09-08T12:00:00Z'))).toBe('use_soon')
  })

  it('normalizes simple plurals and ranks a dish that uses a soon item first', () => {
    expect(normalizeIngredient('Mushrooms')).toBe('mushroom')
    const fresh = createFreshItems('Mushrooms, spinach', new Date('2026-09-01T12:00:00Z'), 7)
    const dishes: Dish[] = [
      { id: 'a', name: 'Pasta', ingredients: [{ displayName: 'tomato', normalizedName: 'tomato' }], notes: null, sourceUrl: null, photoRef: null, wouldMakeAgain: null, createdAt: '', updatedAt: '' },
      { id: 'b', name: 'Skillet', ingredients: [{ displayName: 'mushrooms', normalizedName: 'mushroom' }], notes: null, sourceUrl: null, photoRef: null, wouldMakeAgain: true, createdAt: '', updatedAt: '' }
    ]
    expect(matchDishes(dishes, fresh, new Date('2026-09-09T12:00:00Z'))[0]).toMatchObject({ dish: { id: 'b' }, usesSoon: true, missing: 0 })
  })

  it('generates safe complete prompts for populated and empty lists', () => {
    const empty = buildChatGPTPrompt([], [], new Date('2026-09-01T12:00:00Z'))
    expect(empty).toContain('No fresh items listed')
    expect(empty).toContain('No saved dishes yet')
    const fresh = createFreshItems('Spinach', new Date('2026-09-01T12:00:00Z'), 7)
    expect(buildChatGPTPrompt(fresh, [], new Date('2026-09-09T12:00:00Z'))).toContain('Spinach (added 2026-09-01) · USE SOON')
  })
})
