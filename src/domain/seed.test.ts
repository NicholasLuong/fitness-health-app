import { describe, expect, it } from 'vitest'
import { createSeedSessions } from './seed'

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
})
