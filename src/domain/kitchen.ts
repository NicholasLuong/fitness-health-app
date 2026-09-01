import { addDays, formatISO, parseISO } from 'date-fns'
import type { Dish, FreshItem, MealLog } from './types'

const aliases: Record<string, string> = {
  tomatoes: 'tomato', potatoes: 'potato', mushrooms: 'mushroom', peppers: 'pepper',
  onions: 'onion', carrots: 'carrot', greens: 'green', scallions: 'green onion'
}

export function normalizeIngredient(value: string): string {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ')
  return aliases[normalized] ?? normalized.replace(/(?<!s)s$/, '')
}

export function parseFreshBatch(value: string): string[] {
  return [...new Set(value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean))]
}

export function createFreshItems(value: string, now: Date, attentionDays: number): FreshItem[] {
  return parseFreshBatch(value).map((name) => ({
    id: crypto.randomUUID(),
    name,
    normalizedName: normalizeIngredient(name),
    addedAt: formatISO(now),
    attentionAt: formatISO(addDays(now, attentionDays)),
    state: 'recent',
    removedAt: null,
    notes: null
  }))
}

export function effectiveFreshState(item: FreshItem, now: Date): FreshItem['state'] {
  if (item.state === 'removed') return 'removed'
  return parseISO(item.attentionAt).getTime() <= now.getTime() ? 'use_soon' : 'recent'
}

export interface DishMatch {
  dish: Dish
  matched: number
  missing: number
  usesSoon: boolean
  rank: number
}

export function matchDishes(dishes: Dish[], freshItems: FreshItem[], now = new Date()): DishMatch[] {
  const active = freshItems.filter((item) => item.state !== 'removed')
  const names = new Set(active.map((item) => item.normalizedName))
  const soon = new Set(active.filter((item) => effectiveFreshState(item, now) === 'use_soon').map((item) => item.normalizedName))
  return dishes.map((dish) => {
    const matchedNames = dish.ingredients.filter((ingredient) => names.has(ingredient.normalizedName))
    const matched = matchedNames.length
    const missing = Math.max(0, dish.ingredients.length - matched)
    const usesSoon = matchedNames.some((ingredient) => soon.has(ingredient.normalizedName))
    const rank = usesSoon ? 0 : missing === 0 ? 1 : missing === 1 ? 2 : 3
    return { dish, matched, missing, usesSoon, rank }
  }).sort((a, b) => a.rank - b.rank || b.matched - a.matched || a.dish.name.localeCompare(b.dish.name))
}

export function buildChatGPTPrompt(freshItems: FreshItem[], dishes: Dish[], now = new Date(), selected?: FreshItem): string {
  const active = freshItems.filter((item) => item.state !== 'removed')
  const freshLines = active.length ? active.map((item) => {
    const label = effectiveFreshState(item, now) === 'use_soon' ? ' · USE SOON' : ''
    return `- ${item.name} (added ${item.addedAt.slice(0, 10)})${label}`
  }).join('\n') : '- No fresh items listed'
  const dishLines = dishes.length ? dishes.map((dish) => `- ${dish.name}${dish.ingredients.length ? `: ${dish.ingredients.map((item) => item.displayName).join(', ')}` : ''}`).join('\n') : '- No saved dishes yet'
  return `Help me decide what to cook.${selected ? `\n\nPlease focus on using ${selected.name}.` : ''}\n\nFresh ingredients I should use:\n${freshLines}\n\nDishes I already like:\n${dishLines}\n\nPrioritize ingredients marked use soon.\nFirst recommend any saved dish that fits.\nThen suggest up to three simple new dishes.\nNew dishes should take no more than 45 minutes and require at most two additional groceries.\nDo not include calorie or macro tracking.`
}

export function dishStats(dishId: string, meals: MealLog[]) {
  const logs = meals.filter((meal) => meal.dishId === dishId).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  return { timesCooked: logs.length, lastCooked: logs[0]?.occurredAt ?? null }
}
