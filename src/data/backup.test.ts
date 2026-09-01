import { afterEach, describe, expect, it } from 'vitest'
import { createBackup, restoreBackup, validateBackup } from './backup'
import { ensureSeeded, FitnessDatabase } from './db'
import { PROGRAM_ID } from '../domain/seed'

const databases: FitnessDatabase[] = []
const makeDb = () => { const database = new FitnessDatabase(`steady-test-${crypto.randomUUID()}`); databases.push(database); return database }

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

describe('versioned backups', () => {
  it('round-trips all structured records into an empty database', async () => {
    const source = makeDb()
    await ensureSeeded(source)
    const sourceSessionCount = await source.planSessions.count()
    await source.mealLogs.add({ id: 'meal', occurredAt: '2026-09-08T12:00:00Z', mealDate: '2026-09-08', mealType: 'work_lunch', type: 'home_prepared', dishId: null, leftovers: true, notes: null })
    const backup = await createBackup(source)
    const target = makeDb()
    await restoreBackup(target, backup)
    expect(await target.planSessions.count()).toBe(sourceSessionCount)
    expect(await target.planSessions.where('type').equals('strength').filter((session) => session.scheduledDate > '2026-12-13').count()).toBeGreaterThan(0)
    expect(await target.mealLogs.get('meal')).toMatchObject({ leftovers: true })
    expect(await target.mealGoals.count()).toBe(3)
    expect(await target.workoutTemplates.count()).toBe(3)
  })

  it('rejects future backups before any write', async () => {
    const source = makeDb()
    await ensureSeeded(source)
    const backup = await createBackup(source)
    expect(() => validateBackup({ ...backup, schemaVersion: 999 })).toThrow(/newer version/i)
  })

  it('separates legacy strength sessions without changing their history', async () => {
    const database = makeDb()
    await ensureSeeded(database)
    await database.planSessions.update('w1-strength-1', { programId: PROGRAM_ID, status: 'completed', completedAt: '2026-09-07T18:00:00.000Z' })

    await ensureSeeded(database)

    expect(await database.planSessions.get('w1-strength-1')).toMatchObject({ programId: null, status: 'completed', completedAt: '2026-09-07T18:00:00.000Z' })
  })

  it('upgrades a version-one backup with meal slots and default commitments', async () => {
    const source = makeDb()
    await ensureSeeded(source)
    const current = await createBackup(source)
    const legacy = {
      ...current,
      schemaVersion: 1,
      data: {
        ...current.data,
        mealGoals: undefined,
        workoutTemplates: current.data.workoutTemplates.map((template) => ({ id: template.id, name: template.name, warmupSteps: template.warmupSteps, exerciseDefinitions: template.exerciseDefinitions, active: template.active, createdAt: template.createdAt, updatedAt: template.updatedAt })),
        exercises: current.data.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, movementPattern: exercise.movementPattern, repMin: exercise.repMin, repMax: exercise.repMax, targetSets: exercise.targetSets, defaultIncrementLb: exercise.defaultIncrementLb, substituteExerciseIds: exercise.substituteExerciseIds, optional: exercise.optional })),
        mealLogs: [{ id: 'legacy-meal', occurredAt: '2026-09-08T12:00:00', type: 'home_prepared', dishId: null, leftovers: true, notes: null }]
      }
    }
    const upgraded = validateBackup(legacy)
    expect(upgraded.schemaVersion).toBe(5)
    expect(upgraded.data.mealGoals).toHaveLength(3)
    expect(upgraded.data.mealLogs[0]).toMatchObject({ mealDate: '2026-09-08', mealType: 'work_lunch' })
    expect(upgraded.data.workoutTemplates[0]).toMatchObject({ description: 'Full-body strength session', equipment: 'Gym equipment' })
    expect(upgraded.data.exercises[0].loadUnit).toBe('lb')
  })
})
