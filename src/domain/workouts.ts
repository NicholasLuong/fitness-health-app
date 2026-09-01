import type { Exercise, SetLog } from './types'

export function usesReducedStrengthVolume(notes: string | null | undefined): boolean {
  return Boolean(notes?.includes('reduced volume') || notes?.startsWith('Taper'))
}

export function prescribedSets(exercise: Exercise, reducedVolume: boolean): number {
  return Math.max(1, exercise.targetSets - (reducedVolume ? 1 : 0))
}

export function completedSetsFor(exerciseId: string, setLogs: SetLog[]): number {
  return new Set(setLogs.filter((set) => set.plannedExerciseId === exerciseId).map((set) => set.setNumber)).size
}

export function exerciseIsComplete(exercise: Exercise, setLogs: SetLog[], reducedVolume: boolean): boolean {
  return completedSetsFor(exercise.id, setLogs) >= prescribedSets(exercise, reducedVolume)
}

export function workoutIsComplete(exercises: Exercise[], setLogs: SetLog[], reducedVolume: boolean): boolean {
  return exercises.length > 0 && exercises.every((exercise) => exerciseIsComplete(exercise, setLogs, reducedVolume))
}
