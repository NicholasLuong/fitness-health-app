import { describe, expect, it } from 'vitest'
import { reviewNextLongRun } from './runAdaptation'
import { createSeedSessions } from './seed'

const longRun = (week: number) => createSeedSessions().find((session) => session.id === `w${week}-long`)!

describe('one-week long-run adaptation', () => {
  it('reduces the next build by half a mile after a modest shortfall', () => {
    const sessions = createSeedSessions()
    const review = reviewNextLongRun(longRun(2), 5, 'challenging', sessions)
    expect(review).toMatchObject({ kind: 'adjust', suggestedDistance: 6.5, reason: 'reduce_half' })
    expect(longRun(3).plannedDistanceMiles).toBe(7)
  })

  it('uses an existing cutback week instead of reducing it again', () => {
    const review = reviewNextLongRun(longRun(3), 5.5, 'challenging', createSeedSessions())
    expect(review).toMatchObject({ kind: 'buffer', nextSession: { id: 'w4-long', plannedDistanceMiles: 5 } })
  })

  it('holds the current target after a larger difficult shortfall', () => {
    const review = reviewNextLongRun(longRun(5), 6, 'challenging', createSeedSessions())
    expect(review).toMatchObject({ kind: 'adjust', suggestedDistance: 8, reason: 'repeat' })
  })

  it('steps back after stopping before halfway', () => {
    const review = reviewNextLongRun(longRun(5), 3, 'stopped_early', createSeedSessions())
    expect(review).toMatchObject({ kind: 'adjust', suggestedDistance: 7.5, reason: 'step_back' })
  })

  it('keeps the plan for a half-mile gap or a comfortable run', () => {
    expect(reviewNextLongRun(longRun(2), 5.5, 'challenging', createSeedSessions()).kind).toBe('none')
    expect(reviewNextLongRun(longRun(2), 4.5, 'comfortable', createSeedSessions()).kind).toBe('none')
  })

  it('never rewrites taper or race day when there is no later training long run', () => {
    expect(reviewNextLongRun(longRun(13), 5, 'stopped_early', createSeedSessions()).kind).toBe('none')
  })
})
