import { describe, expect, it } from 'vitest'
import { createSeedSessions, createStrengthSessions, exercises, PROGRAM_ID, workoutTemplates } from './seed'

describe('approved training seed', () => {
  it('seeds all exact plan dates and distances', () => {
    const sessions = createSeedSessions()
    expect(sessions).toHaveLength(55)
    expect(sessions.filter((session) => session.type === 'easy_run').map((session) => session.plannedDistanceMiles)).toEqual([3, 3, 3, 3, 3.5, 3.5, 3, 4, 4, 4, 4, 4, 3, 2])
    expect(sessions.filter((session) => session.type === 'long_run').map((session) => session.plannedDistanceMiles)).toEqual([5, 6, 7, 5, 8, 9, 6, 10, 8, 11, 8, 12, 8])
    const race = sessions.find((session) => session.type === 'race')
    expect(race).toMatchObject({ scheduledDate: '2026-12-13', plannedDistanceMiles: 13.1 })
  })

  it('tapers strength and omits race-week Thursday', () => {
    const sessions = createSeedSessions()
    expect(sessions.filter((session) => session.originalDate >= '2026-11-30' && session.originalDate <= '2026-12-06' && session.type === 'strength')).toHaveLength(2)
    expect(sessions.filter((session) => session.originalDate >= '2026-12-07' && session.type === 'strength').map((session) => session.originalDate)).toEqual(['2026-12-07'])
  })

  it('keeps strength independent and continuing after the race plan', () => {
    const sessions = createSeedSessions()
    expect(sessions.filter((session) => session.type === 'strength').every((session) => session.programId === null)).toBe(true)
    expect(sessions.filter((session) => session.type !== 'strength').every((session) => session.programId === PROGRAM_ID)).toBe(true)
    expect(createStrengthSessions('2026-12-14', '2026-12-27').map((session) => session.scheduledDate)).toEqual(['2026-12-14', '2026-12-17', '2026-12-21', '2026-12-24'])
  })

  it('offers balanced default, machine, and band workout templates', () => {
    expect(workoutTemplates.map((template) => template.name)).toEqual(['Everyday full body', 'Machine only', 'Resistance bands'])
    expect(workoutTemplates.every((template) => template.exerciseDefinitions.length === 6)).toBe(true)
    expect(exercises.find((exercise) => exercise.id === 'band-row')?.loadUnit).toBe('band_level')
  })
})
