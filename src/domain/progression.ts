import type { Exercise, SetLog, WorkoutLog } from './types'

export interface LoadRecommendation {
  weightLb: number
  reason: 'start' | 'progress' | 'hold' | 'deload'
  lastSummary: string | null
}

export function formatExerciseLoad(exercise: Exercise, value: number): string {
  if (exercise.loadUnit === 'band_level') return `band level ${value}`
  return `${value} lb`
}

export function recommendLoad(
  exercise: Exercise,
  workoutLogs: WorkoutLog[],
  setLogs: SetLog[]
): LoadRecommendation {
  const completeLogs = workoutLogs
    .filter((log) => log.status === 'completed')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const sessions = completeLogs.map((log) => {
    const sets = setLogs
      .filter((set) => set.workoutLogId === log.id && set.performedExerciseId === exercise.id)
      .sort((a, b) => a.setNumber - b.setNumber)
    return { log, sets }
  }).filter(({ sets }) => sets.length > 0)

  if (!sessions.length) return { weightLb: exercise.loadUnit === 'band_level' ? 1 : 0, reason: 'start', lastSummary: null }
  const last = sessions[0].sets
  const weight = last[0].weightLb
  const lastSummary = `${last.length} × ${last.map((set) => set.reps).join('/')} at ${formatExerciseLoad(exercise, weight)}`
  const allAtTop = last.length >= exercise.targetSets && last.every((set) => set.reps >= exercise.repMax)
  if (allAtTop) return { weightLb: weight + exercise.defaultIncrementLb, reason: 'progress', lastSummary }

  const sameLoad = sessions.slice(0, 3).filter(({ sets }) => sets.every((set) => set.weightLb === weight))
  if (sameLoad.length === 3) {
    const totals = sameLoad.map(({ sets }) => sets.reduce((sum, set) => sum + set.reps, 0))
    if (totals[0] < totals[1] && totals[1] < totals[2]) {
      return { weightLb: Math.max(0, weight - exercise.defaultIncrementLb), reason: 'deload', lastSummary }
    }
  }
  return { weightLb: weight, reason: 'hold', lastSummary }
}
