import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, Dumbbell, Footprints, Plus, Salad, Scale, TrendingUp } from 'lucide-react'
import { db } from '../data/db'
import { addCalendarDays, formatDay, toISODate } from '../domain/dates'
import { adherenceForWeek, sessionsForWeek } from '../domain/sessions'
import type { Measurement } from '../domain/types'
import { Button, Card, Chip, EmptyState, ProgressBar, SectionHeader } from '../components/ui'
import { MeasurementModal } from '../components/ActionModals'

function weightPath(items: Measurement[]) {
  if (!items.length) return { points: '', smooth: '', min: 0, max: 0 }
  const values = items.map((item) => item.value)
  const min = Math.min(...values) - 1
  const max = Math.max(...values) + 1
  const x = (index: number) => items.length === 1 ? 150 : 10 + index * (280 / (items.length - 1))
  const y = (value: number) => 125 - ((value - min) / Math.max(1, max - min)) * 105
  const points = items.map((item, index) => `${x(index)},${y(item.value)}`).join(' ')
  const averages = values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - 1), Math.min(values.length, index + 2))
    return slice.reduce((sum, value) => sum + value, 0) / slice.length
  })
  return { points, smooth: averages.map((value, index) => `${x(index)},${y(value)}`).join(' '), min, max }
}

export function ProgressPage() {
  const sessions = useLiveQuery(() => db.planSessions.toArray(), []) ?? []
  const meals = useLiveQuery(() => db.mealLogs.toArray(), []) ?? []
  const mealGoals = useLiveQuery(() => db.mealGoals.toArray(), []) ?? []
  const workouts = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const sets = useLiveQuery(() => db.setLogs.toArray(), []) ?? []
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const measurements = useLiveQuery(() => db.measurements.orderBy('measuredAt').toArray(), []) ?? []
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const [measurementOpen, setMeasurementOpen] = useState(false)
  const today = toISODate(new Date())
  if (!settings) return null

  const currentWeekIndex = Math.max(0, Math.min(13, Math.floor((new Date(`${today}T12:00:00`).getTime() - new Date('2026-09-07T12:00:00').getTime()) / (7 * 86_400_000))))
  const firstWeek = Math.max(0, currentWeekIndex - 5)
  const weekStarts = Array.from({ length: Math.min(6, 14 - firstWeek) }, (_, index) => addCalendarDays('2026-09-07', (firstWeek + index) * 7))
  const weeks = weekStarts.map((start) => {
    const stats = adherenceForWeek(sessions, meals, start, settings.homeMealWeeklyGoal, mealGoals)
    const runs = sessionsForWeek(sessions, start).filter((session) => ['easy_run', 'long_run', 'race'].includes(session.type))
    return { start, stats, plannedMiles: runs.reduce((sum, session) => sum + (session.plannedDistanceMiles ?? 0), 0), actualMiles: runs.reduce((sum, session) => sum + (session.actualDistanceMiles ?? 0), 0) }
  })
  const completeRunDistances = sessions.filter((session) => ['easy_run', 'long_run', 'race'].includes(session.type) && session.status === 'completed').map((session) => session.actualDistanceMiles ?? 0)
  const longestRun = Math.max(0, ...completeRunDistances)
  const completedWorkoutIds = new Set(workouts.filter((workout) => workout.status === 'completed').map((workout) => workout.id))
  const strengthLatest = exercises.map((exercise) => {
    const history = sets.filter((set) => set.performedExerciseId === exercise.id && completedWorkoutIds.has(set.workoutLogId)).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    const latestDate = history[0]?.completedAt.slice(0, 10)
    const latestSets = latestDate ? history.filter((set) => set.completedAt.slice(0, 10) === latestDate) : []
    return { exercise, latest: history[0], sets: latestSets }
  }).filter((item) => item.latest).sort((a, b) => b.latest!.completedAt.localeCompare(a.latest!.completedAt))
  const weights = measurements.filter((measurement) => measurement.type === 'weight').slice(-10)
  const waists = measurements.filter((measurement) => measurement.type === 'waist')
  const trend = weightPath(weights)
  const fullWeeks = weeks.filter((week) => week.start < today && week.stats.fitness.planned > 0)
  let consecutive = 0
  for (let index = fullWeeks.length - 1; index >= 0; index--) {
    if (fullWeeks[index].stats.fitness.completed === fullWeeks[index].stats.fitness.planned) consecutive++
    else break
  }
  const maxMiles = Math.max(1, ...weeks.map((week) => week.plannedMiles))

  return <main className="page">
    <p className="eyebrow">Signals, not a score</p>
    <h1 className="page-title">Progress</h1>
    <p className="page-intro">See the behaviors that matter without pretending a single number can summarize your health.</p>
    <div className="stats-grid">
      <div className="stat"><span>Longest run</span><strong>{longestRun || '—'}{longestRun ? ' mi' : ''}</strong></div>
      <div className="stat"><span>Full weeks</span><strong>{consecutive}</strong><small style={{ display: 'block', color: '#756f64', marginTop: 3 }}>in a row</small></div>
      <div className="stat"><span>Home meals</span><strong>{meals.filter((meal) => meal.type === 'home_prepared').length}</strong><small style={{ display: 'block', color: '#756f64', marginTop: 3 }}>total</small></div>
    </div>

    <SectionHeader eyebrow="Weekly adherence" title="Planned work, clearly counted" />
    <div className="list">{weeks.slice().reverse().map(({ start, stats }) => <Card key={start} style={{ boxShadow: 'none' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}><strong>Week of {formatDay(start, 'MMM d')}</strong><Chip tone={stats.fitness.completed === stats.fitness.planned && stats.fitness.planned ? 'green' : 'neutral'}>{stats.fitness.completed} / {stats.fitness.planned} fitness</Chip></div><div className="stats-grid"><div className="stat"><span>Runs</span><strong>{stats.runs.completed}/{stats.runs.planned}</strong><ProgressBar value={stats.runs.completed} max={stats.runs.planned} /></div><div className="stat"><span>Strength</span><strong>{stats.strength.completed}/{stats.strength.planned}</strong><ProgressBar value={stats.strength.completed} max={stats.strength.planned} tone="yellow" /></div><div className="stat"><span>Meals</span><strong>{stats.meals.completed}/{stats.meals.planned}</strong><ProgressBar value={stats.meals.completed} max={stats.meals.planned} tone="coral" /></div></div></Card>)}</div>

    <div className="progress-grid">
      <section><SectionHeader eyebrow="Running" title="Planned vs. actual" /><Card className="chart-card"><div className="legend"><span><i />Planned</span><span><i className="actual" />Actual</span></div>{weeks.map((week) => <div className="bar-row" key={week.start}><span>{formatDay(week.start, 'MMM d')}</span><div className="bar-pair"><div className="bar"><span style={{ width: `${week.plannedMiles / maxMiles * 100}%` }} /></div><div className="bar actual"><span style={{ width: `${week.actualMiles / maxMiles * 100}%` }} /></div></div><strong>{week.actualMiles}/{week.plannedMiles}</strong></div>)}</Card></section>
      <section><SectionHeader eyebrow="Home cooking" title="Commitments by week" /><Card className="chart-card">{weeks.map((week) => <div className="bar-row" key={week.start}><span>{formatDay(week.start, 'MMM d')}</span><ProgressBar value={week.stats.meals.completed} max={Math.max(week.stats.meals.planned, week.stats.meals.completed)} tone="coral" /><strong>{week.stats.meals.completed}/{week.stats.meals.planned}</strong></div>)}</Card></section>
    </div>

    <SectionHeader eyebrow="Strength" title="Latest exercise work" />
    {strengthLatest.length ? <div className="list">{strengthLatest.slice(0, 8).map(({ exercise, latest, sets: latestSets }) => <div className="list-row" key={exercise.id}><div className="date-badge"><Dumbbell size={18} style={{ margin: 'auto' }} /></div><div className="list-row-main"><strong>{exercise.name}</strong><p>{latestSets.length} sets · {latestSets.map((set) => set.reps).join('/')} reps · {latest!.weightLb} lb</p></div><TrendingUp size={18} /></div>)}</div> : <EmptyState icon={<Dumbbell />} title="Strength history will grow set by set" body="Complete the first workout to establish editable starting loads and deterministic recommendations." />}

    <SectionHeader eyebrow="Weekly weight" title="A trend, not a verdict" action={<Button className="button-small" variant="secondary" onClick={() => setMeasurementOpen(true)}><Plus size={14} style={{ display: 'inline' }} /> Log</Button>} />
    {weights.length ? <Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><div><span className="subtle">Latest</span><h2 style={{ margin: 0, fontSize: '2rem' }}>{weights.at(-1)!.value} {weights.at(-1)!.unit}</h2></div>{weights.length >= 3 && <Chip tone="green">Smoothed trend shown</Chip>}</div><svg className="trend-svg" viewBox="0 0 300 140" role="img" aria-label="Recent weight trend">{weights.length >= 3 && <polyline points={trend.smooth} fill="none" stroke="#f4c76b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />}<polyline className="trend-line" points={trend.points} />{trend.points.split(' ').map((point, index) => { const [cx, cy] = point.split(','); return <circle key={index} className="trend-dot" cx={cx} cy={cy} r="4" /> })}</svg><p className="subtle" style={{ marginBottom: 0 }}>Raw weekly points remain visible. Fluctuations are normal, and this does not estimate body fat.</p></Card> : <EmptyState icon={<Scale />} title="Weight is optional" body="A weekly entry can reveal a longer trend. There is no target weight, daily requirement, or body-fat estimate." />}
    {waists.length > 0 && <p className="subtle" style={{ marginTop: 14 }}>Latest optional waist measurement: <strong>{waists.at(-1)!.value} {waists.at(-1)!.unit}</strong> on {formatDay(waists.at(-1)!.measuredAt.slice(0, 10))}.</p>}
    {measurementOpen && <MeasurementModal defaultUnit={settings.weightUnit} onClose={() => setMeasurementOpen(false)} />}
  </main>
}
