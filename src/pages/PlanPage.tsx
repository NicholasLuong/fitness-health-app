import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, format } from 'date-fns'
import { Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, Footprints, RotateCcw, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db, ensureStrengthSessions } from '../data/db'
import { addCalendarDays, formatDay, mondayOf, sundayOf, toISODate } from '../domain/dates'
import { program, raceWeekNumberFor } from '../domain/seed'
import { adjacentDemandWarning, canReschedule, statusFor } from '../domain/sessions'
import type { PlanSession } from '../domain/types'
import { useToast } from '../components/toast-context'
import { Button, Card, Chip, Field, Modal } from '../components/ui'
import { RunCompleteModal } from '../components/ActionModals'

const purposes = ['Establish rhythm', 'Build', 'Build', 'Recovery', 'Build', 'Build', 'Recovery', 'Build', 'Recovery / consolidation', 'Build', 'Recovery / consolidation', 'Peak long run', 'Taper begins', 'Race week']

function SessionModal({ session, allSessions, editMode, onClose }: { session: PlanSession; allSessions: PlanSession[]; editMode: boolean; onClose: () => void }) {
  const [rescheduling, setRescheduling] = useState(false)
  const [runComplete, setRunComplete] = useState(false)
  const [date, setDate] = useState(session.scheduledDate)
  const [title, setTitle] = useState(session.title)
  const [distance, setDistance] = useState(session.plannedDistanceMiles?.toString() ?? '')
  const navigate = useNavigate()
  const { notify } = useToast()
  const today = toISODate(new Date())
  const state = statusFor(session, today)
  const warning = date !== session.scheduledDate && adjacentDemandWarning(allSessions, session, date)
  const saveMove = async () => {
    if (!canReschedule(session, date)) return
    await db.planSessions.update(session.id, { scheduledDate: date, status: date < today ? 'waiting' : 'upcoming' })
    notify(`Moved to ${formatDay(date)}.`)
    onClose()
  }
  const skip = async () => {
    if (!window.confirm(`Skip ${session.title}? It will not roll into next week.`)) return
    await db.planSessions.update(session.id, { status: 'skipped' })
    notify('Session skipped. Next week stays unchanged.')
    onClose()
  }
  const saveEdit = async () => {
    await db.planSessions.update(session.id, { title: title.trim() || session.title, plannedDistanceMiles: session.type === 'strength' ? null : Number(distance) })
    notify('Plan session updated.')
    onClose()
  }
  if (runComplete) return <RunCompleteModal session={session} onClose={onClose} />
  return <Modal title={session.title} onClose={onClose}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}><Chip tone={state === 'completed' ? 'green' : state === 'waiting' ? 'yellow' : state === 'skipped' ? 'neutral' : 'coral'}>{state}</Chip>{session.scheduledDate !== session.originalDate && <Chip tone="green">Rescheduled</Chip>}</div>
    <p className="subtle"><strong>{formatDay(session.scheduledDate, 'EEEE, MMMM d')}</strong>{session.plannedDistanceMiles ? ` · ${session.plannedDistanceMiles} miles` : ' · Full body'}<br />{session.notes}</p>
    {session.scheduledDate !== session.originalDate && <p className="subtle">Originally {formatDay(session.originalDate)}.</p>}
    {state === 'completed' && <div className="notice"><Check size={16} style={{ display: 'inline', marginRight: 6 }} />Completed {session.completedAt ? format(new Date(session.completedAt), "MMM d 'at' h:mm a") : ''}{session.actualDistanceMiles !== null ? ` · ${session.actualDistanceMiles} actual miles` : ''}</div>}
    {editMode && state !== 'completed' && <><div className="divider" /><p className="eyebrow">Edit plan mode</p><Field label="Title"><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></Field>{session.type !== 'strength' && <Field label="Planned distance"><input className="input" type="number" step="0.1" min="0" value={distance} onChange={(event) => setDistance(event.target.value)} /></Field>}<Button variant="secondary" onClick={saveEdit}>Save plan change</Button></>}
    {rescheduling && <><div className="divider" /><Field label="New day" hint="Commitments can move only within their original Monday–Sunday week."><input className="input" type="date" min={toISODate(mondayOf(session.originalDate))} max={toISODate(sundayOf(session.originalDate))} value={date} onChange={(event) => setDate(event.target.value)} /></Field>{warning && <div className="notice">This places two demanding lower-body sessions on adjacent days. It is allowed, but consider giving the long run more space.</div>}<div className="modal-actions"><Button variant="ghost" onClick={() => setRescheduling(false)}>Cancel</Button><Button disabled={!canReschedule(session, date)} onClick={saveMove}>Move session</Button></div></>}
    {!rescheduling && state !== 'completed' && state !== 'skipped' && <div className="modal-actions">
      <Button variant="ghost" onClick={skip}>Skip</Button>
      <Button variant="secondary" onClick={() => setRescheduling(true)}>Reschedule</Button>
      {session.type === 'strength' ? <Button onClick={() => navigate(`/workout/${session.id}`)}>Start workout</Button> : <Button onClick={() => setRunComplete(true)}>Complete run</Button>}
    </div>}
  </Modal>
}

export function PlanPage() {
  const sessions = useLiveQuery(() => db.planSessions.orderBy('scheduledDate').toArray(), []) ?? []
  const today = toISODate(new Date())
  const initialMonday = today < program.startDate ? program.startDate : toISODate(mondayOf(today))
  const [weekStart, setWeekStart] = useState(initialMonday)
  const [selected, setSelected] = useState<PlanSession | null>(null)
  const [editMode, setEditMode] = useState(false)
  const weekEnd = addCalendarDays(weekStart, 6)
  useEffect(() => { ensureStrengthSessions(weekStart, weekEnd).catch(() => undefined) }, [weekStart, weekEnd])
  const weekSessions = sessions.filter((session) => session.scheduledDate >= weekStart && session.scheduledDate <= weekEnd)
  const weekNumber = raceWeekNumberFor(weekStart)
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index)), [weekStart])
  const raceWeek = weekNumber !== null

  return <main className="page">
    <p className="eyebrow">Race plan + ongoing strength</p>
    <h1 className="page-title">The plan</h1>
    <p className="page-intro">The half-marathon schedule stays inside its 14 weeks. Strength continues at two flexible sessions per week after race day.</p>
    <Card style={{ boxShadow: 'none', marginBottom: 18 }}><div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><ShieldCheck color="#1f5c4a" /><p className="subtle" style={{ margin: 0 }}>Runs belong to the September 7–December 13 race plan. Strength is an ongoing weekly rhythm. Both can move within their week, and missed work never stacks up.</p></div></Card>

    <div className="week-picker"><button className="icon-button" aria-label="Previous week" onClick={() => setWeekStart(addCalendarDays(weekStart, -7))}><ChevronLeft /></button><div><strong>{raceWeek ? `Race week ${weekNumber} · ${purposes[weekNumber - 1]}` : 'Ongoing strength'}</strong><span>{formatDay(weekStart, 'MMM d')} – {formatDay(weekEnd, 'MMM d, yyyy')}</span></div><button className="icon-button" aria-label="Next week" onClick={() => setWeekStart(addCalendarDays(weekStart, 7))}><ChevronRight /></button></div>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 15 }}><Button className="button-small" variant={editMode ? 'primary' : 'ghost'} onClick={() => setEditMode(!editMode)}>{editMode ? 'Done editing' : 'Edit plan'}</Button></div>

    {days.map((day) => {
      const items = weekSessions.filter((session) => session.scheduledDate === day)
      return <section className="day-group" key={day}><div className="day-label"><span>{formatDay(day, 'EEEE')}</span><span>{formatDay(day, 'MMM d')}</span></div>{items.length ? <div className="list">{items.map((session) => {
        const state = statusFor(session, today)
        return <button key={session.id} className={`list-row ${state === 'completed' ? 'session-completed' : ''}`} style={{ width: '100%', textAlign: 'left', color: 'inherit', cursor: 'pointer' }} onClick={() => setSelected(session)}>
          <div className="date-badge">{session.type === 'strength' ? <Dumbbell size={20} style={{ margin: 'auto' }} /> : <Footprints size={20} style={{ margin: 'auto' }} />}</div>
          <div className="list-row-main"><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}><Chip tone={state === 'completed' ? 'green' : state === 'waiting' ? 'yellow' : state === 'skipped' ? 'neutral' : 'coral'}>{state}</Chip>{session.originalDate !== session.scheduledDate && <Chip tone="green">Moved</Chip>}</div><strong>{session.title}</strong><p>{session.plannedDistanceMiles ? `${session.plannedDistanceMiles} miles` : session.notes?.startsWith('Taper') ? 'Reduced volume' : 'Core full-body workout'}</p></div><ChevronRight size={18} />
        </button>
      })}</div> : <div className="list-row" style={{ opacity: .62 }}><div className="date-badge"><Clock3 size={18} style={{ margin: 'auto' }} /></div><div className="list-row-main"><strong>Open day</strong><p>{raceWeek ? 'No plan commitment. Rest is part of the plan.' : 'No strength commitment. Move a session here if this day fits better.'}</p></div></div>}</section>
    })}
    {!raceWeek && <div style={{ textAlign: 'center', marginTop: 16 }}><Button variant="secondary" onClick={() => setWeekStart(program.startDate)}><RotateCcw size={15} style={{ display: 'inline', marginRight: 6 }} />View race week 1</Button></div>}
    {selected && <SessionModal session={selected} allSessions={sessions} editMode={editMode} onClose={() => setSelected(null)} />}
  </main>
}
