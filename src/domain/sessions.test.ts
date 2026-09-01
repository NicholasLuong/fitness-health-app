import { describe, expect, it } from 'vitest'
import { createSeedSessions } from './seed'
import { adherenceForWeek, canReschedule, reconcileSessions, statusFor } from './sessions'

describe('weekly commitment rules', () => {
  it('allows movement only inside the commitment week', () => {
    const session = createSeedSessions().find((item) => item.id === 'w1-easy')!
    expect(canReschedule(session, '2026-09-09')).toBe(true)
    expect(canReschedule(session, '2026-09-14')).toBe(false)
  })

  it('marks prior-day work waiting, then skipped after the week boundary', () => {
    const session = createSeedSessions().find((item) => item.id === 'w1-easy')!
    expect(statusFor(session, '2026-09-09')).toBe('waiting')
    expect(statusFor(session, '2026-09-14')).toBe('skipped')
    const reconciled = reconcileSessions([session], '2026-09-14')
    expect(reconciled[0].scheduledDate).toBe('2026-09-08')
  })

  it('uses race week actual denominator rather than a hard-coded quota', () => {
    const sessions = createSeedSessions()
    const stats = adherenceForWeek(sessions, [], '2026-12-07', 5)
    expect(stats.runs.planned).toBe(2)
    expect(stats.strength.planned).toBe(1)
    expect(stats.fitness.planned).toBe(3)
  })

  it('counts partial-distance runs as completed while retaining the difference', () => {
    const sessions = createSeedSessions()
    const run = sessions.find((item) => item.id === 'w1-long')!
    run.status = 'completed'
    run.actualDistanceMiles = 3.2
    const stats = adherenceForWeek(sessions, [], '2026-09-07', 5)
    expect(stats.runs.completed).toBe(1)
    expect(run.plannedDistanceMiles).toBe(5)
    expect(run.actualDistanceMiles).toBe(3.2)
  })
})
