import { beforeDay, inSameWeek, mondayOf, sundayOf, toISODate } from './dates'
import { mealGoalSummary } from './meals'
import type { MealGoal, MealLog, PlanSession } from './types'

export function statusFor(session: PlanSession, today: string): PlanSession['status'] {
  if (session.status === 'completed' || session.status === 'skipped') return session.status
  if (!beforeDay(session.scheduledDate, today)) return 'upcoming'
  return beforeDay(session.scheduledDate, toISODate(mondayOf(today))) ? 'skipped' : 'waiting'
}

export function reconcileSessions(sessions: PlanSession[], today: string): PlanSession[] {
  return sessions.map((session) => ({ ...session, status: statusFor(session, today) }))
}

export function canReschedule(session: PlanSession, date: string): boolean {
  return session.status !== 'completed' && session.status !== 'skipped' && inSameWeek(session.originalDate, date)
}

export function sessionsForWeek(sessions: PlanSession[], date: string): PlanSession[] {
  const start = toISODate(mondayOf(date))
  const end = toISODate(sundayOf(date))
  return sessions.filter((session) => session.scheduledDate >= start && session.scheduledDate <= end)
}

export function adherenceForWeek(sessions: PlanSession[], meals: MealLog[], date: string, mealGoal: number, mealGoals: MealGoal[] = []) {
  const week = sessionsForWeek(sessions, date).filter((session) => session.required)
  const runs = week.filter((session) => ['easy_run', 'long_run', 'race'].includes(session.type))
  const strength = week.filter((session) => session.type === 'strength')
  const start = toISODate(mondayOf(date))
  const end = toISODate(sundayOf(date))
  const homeMeals = meals.filter((meal) => meal.type === 'home_prepared' && meal.mealDate >= start && meal.mealDate <= end).length
  const mealCommitments = mealGoalSummary(mealGoals, meals, date)
  const completed = (list: PlanSession[]) => list.filter((session) => session.status === 'completed').length
  return {
    runs: { completed: completed(runs), planned: runs.length },
    strength: { completed: completed(strength), planned: strength.length },
    fitness: { completed: completed(week), planned: week.length },
    meals: mealCommitments.planned ? { completed: mealCommitments.completed, planned: mealCommitments.planned } : { completed: homeMeals, planned: mealGoal }
  }
}

export function adjacentDemandWarning(sessions: PlanSession[], moving: PlanSession, newDate: string): boolean {
  const demanding = new Set(['strength', 'long_run', 'race'])
  if (!demanding.has(moving.type)) return false
  const time = new Date(`${newDate}T12:00:00`).getTime()
  return sessions.some((session) => {
    if (session.id === moving.id || session.status === 'skipped' || !demanding.has(session.type)) return false
    const other = new Date(`${session.scheduledDate}T12:00:00`).getTime()
    return Math.abs(other - time) === 86_400_000
  })
}
