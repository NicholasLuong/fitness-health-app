import { describe, expect, it } from 'vitest'
import { exercises } from './seed'
import { formatExerciseLoad, recommendLoad } from './progression'
import type { SetLog, WorkoutLog } from './types'

const exercise = exercises.find((item) => item.id === 'db-bench')!
const workout = (id: string, day: number): WorkoutLog => ({ id, planSessionId: null, templateId: 't', startedAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z`, completedAt: `2026-09-${String(day).padStart(2, '0')}T11:00:00Z`, status: 'completed', notes: null })
const sets = (workoutLogId: string, reps: number[], weightLb = 30): SetLog[] => reps.map((value, index) => ({ id: `${workoutLogId}-${index}`, workoutLogId, plannedExerciseId: exercise.id, performedExerciseId: exercise.id, setNumber: index + 1, weightLb, reps: value, completedAt: '2026-09-01T11:00:00Z' }))

describe('double progression', () => {
  it('increases after every prescribed set reaches the rep ceiling', () => {
    expect(recommendLoad(exercise, [workout('a', 1)], sets('a', [12, 12, 12]))).toMatchObject({ weightLb: 35, reason: 'progress' })
  })

  it('holds load when the top target is not met', () => {
    expect(recommendLoad(exercise, [workout('a', 1)], sets('a', [12, 11, 10]))).toMatchObject({ weightLb: 30, reason: 'hold' })
  })

  it('deloads after three consecutive declines at the same load', () => {
    const workouts = [workout('old', 1), workout('mid', 4), workout('new', 8)]
    const history = [...sets('old', [12, 11, 10]), ...sets('mid', [10, 10, 10]), ...sets('new', [9, 9, 9])]
    expect(recommendLoad(exercise, workouts, history)).toMatchObject({ weightLb: 25, reason: 'deload' })
  })

  it('keeps substitution history separate', () => {
    const substitute = exercises.find((item) => item.id === 'chest-press')!
    const history = sets('a', [12, 12, 12]).map((set) => ({ ...set, performedExerciseId: substitute.id }))
    expect(recommendLoad(exercise, [workout('a', 1)], history).reason).toBe('start')
  })

  it('starts and formats band resistance as a level', () => {
    const band = exercises.find((item) => item.id === 'band-row')!
    expect(recommendLoad(band, [], [])).toMatchObject({ weightLb: 1, reason: 'start' })
    expect(formatExerciseLoad(band, 3)).toBe('band level 3')
  })
})
