import { format, getISODay, parseISO } from 'date-fns'
import { addCalendarDays, mondayOf, sundayOf, toISODate } from './dates'
import type { MealGoal, MealLog, MealType, TrackedMealType } from './types'

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  work_lunch: 'Work lunch',
  dinner: 'Dinner',
  other: 'Other home meal'
}

export function localMealDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function inferredMealType(date = new Date()): MealType {
  const hour = date.getHours()
  const weekday = getISODay(date)
  if (hour < 11) return 'breakfast'
  if (hour < 15 && weekday <= 5) return 'work_lunch'
  if (hour >= 16) return 'dinner'
  return 'other'
}

export function mealGoalsForWeek(goals: MealGoal[], date: string): MealGoal[] {
  return mealGoalVersionsForWeek(goals, date).filter((goal) => goal.enabled)
}

export function mealGoalVersionsForWeek(goals: MealGoal[], date: string): MealGoal[] {
  const weekStart = toISODate(mondayOf(date))
  const matching = goals.filter((goal) => goal.effectiveFrom <= weekStart && (!goal.effectiveUntil || goal.effectiveUntil >= weekStart))
  const latest = new Map<TrackedMealType, MealGoal>()
  matching.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).forEach((goal) => latest.set(goal.mealType, goal))
  return [...latest.values()].sort((a, b) => ['breakfast', 'work_lunch', 'dinner'].indexOf(a.mealType) - ['breakfast', 'work_lunch', 'dinner'].indexOf(b.mealType))
}

export function mealGoalProgress(goals: MealGoal[], meals: MealLog[], date: string) {
  const weekStart = toISODate(mondayOf(date))
  const weekEnd = toISODate(sundayOf(date))
  const today = localMealDate(new Date())
  return mealGoalsForWeek(goals, date).map((goal) => {
    const creditedDates = new Set(meals.filter((meal) => {
      if (meal.type !== 'home_prepared' || meal.mealType !== goal.mealType || meal.mealDate < weekStart || meal.mealDate > weekEnd) return false
      return goal.eligibleWeekdays.includes(getISODay(parseISO(meal.mealDate)))
    }).map((meal) => meal.mealDate))
    return {
      goal,
      completed: creditedDates.size,
      target: goal.targetPerWeek,
      remaining: Math.max(0, goal.targetPerWeek - creditedDates.size),
      todayLogged: creditedDates.has(today)
    }
  })
}

export function mealGoalSummary(goals: MealGoal[], meals: MealLog[], date: string) {
  const rows = mealGoalProgress(goals, meals, date)
  return {
    rows,
    completed: rows.reduce((sum, row) => sum + Math.min(row.completed, row.target), 0),
    planned: rows.reduce((sum, row) => sum + row.target, 0)
  }
}

export function normalizedMealLog(log: Omit<MealLog, 'mealDate' | 'mealType'> & Partial<Pick<MealLog, 'mealDate' | 'mealType'>>): MealLog {
  const occurred = new Date(log.occurredAt)
  return { ...log, mealDate: log.mealDate ?? localMealDate(occurred), mealType: log.mealType ?? inferredMealType(occurred) }
}

export function createHomeMealLog({ mealType = inferredMealType(), dishId = null, leftovers = false, now = new Date() }: { mealType?: MealType; dishId?: string | null; leftovers?: boolean; now?: Date }): MealLog {
  return {
    id: crypto.randomUUID(), occurredAt: now.toISOString(), mealDate: localMealDate(now), mealType,
    type: 'home_prepared', dishId, leftovers, notes: null
  }
}

export function nextGoalVersion(goals: MealGoal[], values: Pick<MealGoal, 'mealType' | 'label' | 'targetPerWeek' | 'eligibleWeekdays' | 'enabled'>, now = new Date()) {
  const effectiveFrom = toISODate(mondayOf(now))
  const current = mealGoalVersionsForWeek(goals, effectiveFrom).find((goal) => goal.mealType === values.mealType)
  const timestamp = now.toISOString()
  if (current?.effectiveFrom === effectiveFrom) return { close: null, goal: { ...current, ...values, updatedAt: timestamp } }
  return {
    close: current ? { id: current.id, effectiveUntil: addCalendarDays(effectiveFrom, -1), updatedAt: timestamp } : null,
    goal: { id: crypto.randomUUID(), ...values, effectiveFrom, effectiveUntil: null, createdAt: timestamp, updatedAt: timestamp }
  }
}
