import { describe, expect, it } from 'vitest'
import { defaultMealGoals } from './seed'
import { createHomeMealLog, inferredMealType, mealGoalProgress, mealGoalSummary, nextGoalVersion } from './meals'

describe('meal commitments', () => {
  it('counts only one credit per daily meal slot while keeping leftovers eligible', () => {
    const meals = [
      createHomeMealLog({ mealType: 'breakfast', now: new Date('2026-09-01T08:00:00') }),
      createHomeMealLog({ mealType: 'breakfast', leftovers: true, now: new Date('2026-09-01T09:00:00') }),
      createHomeMealLog({ mealType: 'breakfast', now: new Date('2026-09-02T08:00:00') })
    ]
    const breakfast = mealGoalProgress(defaultMealGoals, meals, '2026-09-01').find((row) => row.goal.mealType === 'breakfast')!
    expect(breakfast.completed).toBe(2)
    expect(breakfast.remaining).toBe(5)
  })

  it('credits work lunches only on configured workdays', () => {
    const meals = [
      createHomeMealLog({ mealType: 'work_lunch', now: new Date('2026-09-04T12:00:00') }),
      createHomeMealLog({ mealType: 'work_lunch', now: new Date('2026-09-05T12:00:00') })
    ]
    const lunch = mealGoalProgress(defaultMealGoals, meals, '2026-09-01').find((row) => row.goal.mealType === 'work_lunch')!
    expect(lunch.completed).toBe(1)
  })

  it('derives the combined 7 breakfast, 5 lunch, and 5 dinner target', () => {
    expect(mealGoalSummary(defaultMealGoals, [], '2026-09-01')).toMatchObject({ completed: 0, planned: 17 })
  })

  it('infers a useful one-tap default from time and weekday', () => {
    expect(inferredMealType(new Date('2026-09-01T08:00:00'))).toBe('breakfast')
    expect(inferredMealType(new Date('2026-09-01T12:00:00'))).toBe('work_lunch')
    expect(inferredMealType(new Date('2026-09-05T12:00:00'))).toBe('other')
    expect(inferredMealType(new Date('2026-09-01T18:00:00'))).toBe('dinner')
  })

  it('creates an effective-dated version so earlier weeks keep their denominator', () => {
    const change = nextGoalVersion(defaultMealGoals, {
      mealType: 'dinner', label: 'Dinners', targetPerWeek: 4,
      eligibleWeekdays: [1, 2, 3, 4, 5, 6, 7], enabled: true
    }, new Date('2026-09-08T12:00:00'))
    expect(change.close).toMatchObject({ id: 'meal-goal-dinner-v1', effectiveUntil: '2026-09-06' })
    expect(change.goal).toMatchObject({ effectiveFrom: '2026-09-07', targetPerWeek: 4 })
  })
})
