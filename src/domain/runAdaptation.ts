import type { PlanSession, RunFeedback } from './types'

export type LongRunReview =
  | { kind: 'none'; message: string }
  | { kind: 'buffer'; nextSession: PlanSession; message: string }
  | { kind: 'adjust'; nextSession: PlanSession; suggestedDistance: number; reason: 'reduce_half' | 'repeat' | 'step_back'; message: string }

const baselineDistance = (session: PlanSession) => session.baselineDistanceMiles ?? session.plannedDistanceMiles ?? 0
const halfMile = (distance: number) => Math.round(distance * 2) / 2

export function reviewNextLongRun(session: PlanSession, actualDistance: number, feedback: RunFeedback, sessions: PlanSession[]): LongRunReview {
  if (session.type !== 'long_run') return { kind: 'none', message: 'Run saved. The race schedule stays unchanged.' }

  const next = sessions
    .filter((candidate) => candidate.type === 'long_run' && candidate.originalDate > session.originalDate)
    .sort((a, b) => a.originalDate.localeCompare(b.originalDate))[0]
  if (!next) return { kind: 'none', message: 'Run saved. Your taper and race day stay unchanged.' }

  const planned = session.plannedDistanceMiles ?? 0
  const currentBaseline = baselineDistance(session)
  const nextBaseline = baselineDistance(next)
  const nextPlanned = next.plannedDistanceMiles ?? nextBaseline
  const shortfall = planned - actualDistance

  if (shortfall <= 0.5 || feedback === 'comfortable') {
    return { kind: 'none', message: 'Run complete. Next week stays on plan.' }
  }

  if (nextBaseline <= currentBaseline) {
    return {
      kind: 'buffer',
      nextSession: next,
      message: `Your next long run is already a ${nextPlanned}-mile recovery run, so the plan has buffer built in.`
    }
  }

  let candidate: number
  let reason: 'reduce_half' | 'repeat' | 'step_back'
  if (feedback === 'challenging' && shortfall <= 1.5) {
    candidate = nextBaseline - 0.5
    reason = 'reduce_half'
  } else if (feedback === 'stopped_early' && actualDistance < currentBaseline / 2) {
    candidate = currentBaseline - 0.5
    reason = 'step_back'
  } else {
    candidate = currentBaseline
    reason = 'repeat'
  }

  const suggestedDistance = Math.max(0.5, halfMile(Math.min(nextPlanned, candidate)))
  if (suggestedDistance >= nextPlanned) return { kind: 'none', message: 'Run saved. Next week stays on plan.' }

  const messages = {
    reduce_half: `Close the gap gently: reduce the next long run from ${nextPlanned} to ${suggestedDistance} miles.`,
    repeat: `Build confidence first: hold the next long run at ${suggestedDistance} miles instead of increasing to ${nextPlanned}.`,
    step_back: `Give yourself more room: step the next long run back to ${suggestedDistance} miles instead of ${nextPlanned}.`
  }
  return { kind: 'adjust', nextSession: next, suggestedDistance, reason, message: messages[reason] }
}
