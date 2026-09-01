import { afterEach, describe, expect, it } from 'vitest'
import { createBackup, restoreBackup, validateBackup } from './backup'
import { ensureSeeded, FitnessDatabase } from './db'

const databases: FitnessDatabase[] = []
const makeDb = () => { const database = new FitnessDatabase(`steady-test-${crypto.randomUUID()}`); databases.push(database); return database }

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
})

describe('versioned backups', () => {
  it('round-trips all structured records into an empty database', async () => {
    const source = makeDb()
    await ensureSeeded(source)
    await source.mealLogs.add({ id: 'meal', occurredAt: '2026-09-08T12:00:00Z', mealDate: '2026-09-08', mealType: 'work_lunch', type: 'home_prepared', dishId: null, leftovers: true, notes: null })
    const backup = await createBackup(source)
    const target = makeDb()
    await restoreBackup(target, backup)
    expect(await target.planSessions.count()).toBe(55)
    expect(await target.mealLogs.get('meal')).toMatchObject({ leftovers: true })
    expect(await target.mealGoals.count()).toBe(3)
  })

  it('rejects future backups before any write', async () => {
    const source = makeDb()
    await ensureSeeded(source)
    const backup = await createBackup(source)
    expect(() => validateBackup({ ...backup, schemaVersion: 999 })).toThrow(/newer version/i)
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
        mealLogs: [{ id: 'legacy-meal', occurredAt: '2026-09-08T12:00:00', type: 'home_prepared', dishId: null, leftovers: true, notes: null }]
      }
    }
    const upgraded = validateBackup(legacy)
    expect(upgraded.schemaVersion).toBe(2)
    expect(upgraded.data.mealGoals).toHaveLength(3)
    expect(upgraded.data.mealLogs[0]).toMatchObject({ mealDate: '2026-09-08', mealType: 'work_lunch' })
  })
})
