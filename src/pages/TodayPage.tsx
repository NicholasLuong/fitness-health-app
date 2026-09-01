import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format } from 'date-fns'
import { ArrowRight, CalendarClock, CookingPot, Dumbbell, Footprints, Plus, Salad, ShoppingBasket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db } from '../data/db'
import { formatDay, toISODate } from '../domain/dates'
import { effectiveFreshState, matchDishes } from '../domain/kitchen'
import { createHomeMealLog, inferredMealType, localMealDate, mealGoalSummary, mealTypeLabels } from '../domain/meals'
import { program } from '../domain/seed'
import { adherenceForWeek, reconcileSessions, statusFor } from '../domain/sessions'
import type { PlanSession } from '../domain/types'
import { useToast } from '../components/toast-context'
import { Button, Card, Chip, ProgressBar, SectionHeader } from '../components/ui'
import { FreshBatchModal, RunCompleteModal } from '../components/ActionModals'

function sessionDescription(session: PlanSession) {
  if (session.type === 'strength') return session.notes?.startsWith('Race') ? 'Light volume · comfortable loads' : 'Full body · about 45 min'
  return `${session.plannedDistanceMiles} miles · conversational effort`
}

export function TodayPage() {
  const sessions = useLiveQuery(() => db.planSessions.orderBy('scheduledDate').toArray(), []) ?? []
  const meals = useLiveQuery(() => db.mealLogs.toArray(), []) ?? []
  const mealGoals = useLiveQuery(() => db.mealGoals.toArray(), []) ?? []
  const dishes = useLiveQuery(() => db.dishes.toArray(), []) ?? []
  const fresh = useLiveQuery(() => db.freshItems.toArray(), []) ?? []
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const [run, setRun] = useState<PlanSession | null>(null)
  const [addFresh, setAddFresh] = useState(false)
  const navigate = useNavigate()
  const { notify } = useToast()
  const today = toISODate(new Date())

  useEffect(() => {
    const next = reconcileSessions(sessions, today)
    const changed = next.filter((session, index) => session.status !== sessions[index]?.status)
    if (changed.length) db.transaction('rw', db.planSessions, () => Promise.all(changed.map((session) => db.planSessions.update(session.id, { status: session.status })))).catch(() => undefined)
  }, [sessions, today])

  const activeSessions = sessions.filter((session) => !['completed', 'skipped'].includes(statusFor(session, today)))
  const waiting = activeSessions.find((session) => statusFor(session, today) === 'waiting')
  const todaySession = activeSessions.find((session) => session.scheduledDate === today)
  const nextSession = activeSessions.find((session) => session.scheduledDate > today)
  const primary = waiting ?? todaySession ?? nextSession
  const nextStrength = activeSessions.find((session) => session.type === 'strength')
  const statsDate = today < program.startDate ? program.startDate : today
  const adherence = settings ? adherenceForWeek(sessions, meals, statsDate, settings.homeMealWeeklyGoal, mealGoals) : null
  const mealCommitments = mealGoalSummary(mealGoals, meals, today)
  const matches = useMemo(() => matchDishes(dishes, fresh), [dishes, fresh])
  const useSoon = fresh.find((item) => item.state !== 'removed' && effectiveFreshState(item, new Date()) === 'use_soon')

  const startPrimary = (session: PlanSession) => {
    if (session.type === 'strength') navigate(`/workout/${session.id}`)
    else setRun(session)
  }
  const quickMealType = inferredMealType()
  const quickMeal = async () => {
    const now = new Date()
    if (quickMealType !== 'other') {
      const existing = await db.mealLogs.where('mealDate').equals(localMealDate(now)).filter((meal) => meal.type === 'home_prepared' && meal.mealType === quickMealType).first()
      if (existing) { notify(`${mealTypeLabels[quickMealType]} is already counted today.`); return }
    }
    await db.mealLogs.add(createHomeMealLog({ mealType: quickMealType, now }))
    notify(`${mealTypeLabels[quickMealType]} logged.`)
  }

  if (!settings || !adherence) return null
  return <main className="page">
    <p className="eyebrow">{format(new Date(), 'EEEE · MMMM d')}</p>
    <h1 className="page-title">What’s next?</h1>
    <p className="page-intro">Running has a finish line. Strength keeps a steady weekly rhythm. One useful choice at a time.</p>

    {waiting && <Card className="waiting-card"><Chip tone="yellow">Waiting</Chip><h3 style={{ margin: '10px 0 5px' }}>{waiting.title} needs a new day</h3><p className="subtle">Originally planned for {formatDay(waiting.originalDate)}. Move it within this week or intentionally skip it.</p><Button className="button-small" variant="secondary" onClick={() => navigate('/plan')}>Reschedule <CalendarClock size={15} style={{ display: 'inline', marginLeft: 5 }} /></Button></Card>}

    {primary ? <Card className="hero-card">
      <p className="eyebrow">{waiting ? 'Your next decision' : primary.scheduledDate === today ? 'Today' : `Coming ${formatDay(primary.scheduledDate, 'EEEE')}`}</p>
      <h2>{primary.title}</h2>
      <p>{sessionDescription(primary)}</p>
      <div className="hero-actions"><Button onClick={() => startPrimary(primary)}>{primary.type === 'strength' ? 'Start workout' : primary.type === 'race' ? 'Log race' : 'Log run'} <ArrowRight size={16} style={{ display: 'inline', marginLeft: 5 }} /></Button>{primary.scheduledDate !== today && <Button variant="secondary" onClick={() => navigate('/plan')}>View the week</Button>}</div>
    </Card> : <Card className="hero-card"><p className="eyebrow">Week clear</p><h2>Nothing is waiting.</h2><p>Your running plan may be complete, while the ongoing strength rhythm remains available from Plan.</p><div className="hero-actions"><Button onClick={() => navigate('/plan')}>View the plan</Button></div></Card>}

    <SectionHeader eyebrow={statsDate === today ? 'This week' : 'First plan week'} title="Keep the rhythm" />
    <div className="stats-grid">
      <div className="stat"><span>Runs</span><strong>{adherence.runs.completed} / {adherence.runs.planned}</strong><ProgressBar value={adherence.runs.completed} max={adherence.runs.planned} /></div>
      <div className="stat"><span>Strength</span><strong>{adherence.strength.completed} / {adherence.strength.planned}</strong><ProgressBar value={adherence.strength.completed} max={adherence.strength.planned} tone="yellow" /></div>
      <div className="stat"><span>Meal commitments</span><strong>{mealCommitments.completed} / {mealCommitments.planned}</strong><ProgressBar value={mealCommitments.completed} max={mealCommitments.planned} tone="coral" /></div>
    </div>

    {(matches[0] || useSoon) && <><SectionHeader eyebrow="Cook tonight" title="Use what you have" action={<button className="link-button" onClick={() => navigate('/kitchen')}>Kitchen</button>} /><Card className="kitchen-hero">
      {matches[0] && <><Chip tone="green">{matches[0].usesSoon ? 'Uses something soon' : matches[0].missing === 0 ? 'Looks ready' : matches[0].missing === 1 ? 'Missing one listed item' : 'A familiar idea'}</Chip><h2 style={{ margin: '10px 0 5px' }}>{matches[0].dish.name}</h2></>}
      {useSoon && <p className="subtle" style={{ marginBottom: 0 }}><strong>{useSoon.name}</strong> is asking for attention. “Use soon” is a planning nudge, not an expiration claim.</p>}
    </Card></>}

    <SectionHeader eyebrow="Quick actions" title="Log it and move on" />
    <div className="quick-grid">
      <button className="quick-action" onClick={() => nextStrength ? navigate(`/workout/${nextStrength.id}`) : notify('No strength session is waiting this week.')}><Dumbbell size={22} />Start workout</button>
      <button className="quick-action" onClick={() => { const nextRun = activeSessions.find((session) => session.type !== 'strength'); nextRun ? setRun(nextRun) : notify('No run is waiting to be logged.') }}><Footprints size={22} />Log run</button>
      <button className="quick-action" onClick={quickMeal}><Salad size={22} />{quickMealType === 'other' ? 'Log home meal' : `Log ${mealTypeLabels[quickMealType].toLowerCase()}`}</button>
      <button className="quick-action" onClick={() => setAddFresh(true)}><ShoppingBasket size={22} />Add groceries</button>
    </div>

    {nextSession && primary?.id !== nextSession.id && <><SectionHeader eyebrow="Coming up" title="The next commitment" /><div className="list"><div className="list-row"><div className="date-badge"><span>{formatDay(nextSession.scheduledDate, 'EEE')}</span><strong>{formatDay(nextSession.scheduledDate, 'd')}</strong></div><div className="list-row-main"><strong>{nextSession.title}</strong><p>{sessionDescription(nextSession)}</p></div><Plus size={18} /></div></div></>}
    {run && <RunCompleteModal session={run} allSessions={sessions} onClose={() => setRun(null)} />}
    {addFresh && <FreshBatchModal settings={settings} onClose={() => setAddFresh(false)} />}
  </main>
}
