import { describe, expect, it } from 'vitest'
import { exercises } from './seed'
import { completedSetsFor, exerciseIsComplete, prescribedSets, usesReducedStrengthVolume, workoutIsComplete } from './workouts'
import type { SetLog } from './types'

const legPress = exercises.find((exercise) => exercise.id === 'leg-press')!
const bench = exercises.find((exercise) => exercise.id === 'db-bench')!
const logged = (exerciseId: string, setNumber: number): SetLog => ({
  id: `${exerciseId}-${setNumber}`,
  workoutLogId: 'workout',
  plannedExerciseId: exerciseId,
  performedExerciseId: exerciseId,
  setNumber,
  weightLb: 20,
  reps: 10,
  completedAt: '2026-09-01T12:00:00.000Z'
})

describe('workout completion', () => {
  it('reduces prescribed sets during taper sessions', () => {
    expect(usesReducedStrengthVolume('Taper: one fewer set per exercise.')).toBe(true)
    expect(prescribedSets(legPress, true)).toBe(2)
  })

  it('counts unique set numbers rather than raw rows', () => {
    expect(completedSetsFor(legPress.id, [logged(legPress.id, 1), { ...logged(legPress.id, 1), id: 'duplicate' }])).toBe(1)
  })

  it('lets exercises be completed in any order', () => {
    const sets = [1, 2, 3].map((set) => logged(bench.id, set))
    expect(exerciseIsComplete(bench, sets, false)).toBe(true)
    expect(exerciseIsComplete(legPress, sets, false)).toBe(false)
  })

  it('requires each exercise rather than only a matching total set count', () => {
    const repeatedBench = [1, 2, 3].map((set) => logged(bench.id, set))
    expect(workoutIsComplete([legPress, bench], repeatedBench, false)).toBe(false)
  })
})
