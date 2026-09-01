import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, Repeat2, Shuffle, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../data/db'
import { recommendLoad } from '../domain/progression'
import type { Exercise, SetLog, WorkoutLog } from '../domain/types'
import { useToast } from '../components/toast-context'
import { Button, Card, Chip, Field, Modal } from '../components/ui'

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function SetEntry({ workoutId, planned, performed, setNumber, recommendation, existing, prior }: {
  workoutId: string; planned: Exercise; performed: Exercise; setNumber: number;
  recommendation: ReturnType<typeof recommendLoad>; existing?: SetLog; prior?: SetLog
}) {
  const [weight, setWeight] = useState(existing?.weightLb ?? recommendation.weightLb)
  const [reps, setReps] = useState(existing?.reps ?? performed.repMin)
  useEffect(() => { if (!existing) { setWeight(recommendation.weightLb); setReps(performed.repMin) } }, [performed.id, recommendation.weightLb, existing])
  const complete = async () => {
    if (existing) {
      await db.setLogs.delete(existing.id)
    } else {
      await db.setLogs.add({ id: crypto.randomUUID(), workoutLogId: workoutId, plannedExerciseId: planned.id, performedExerciseId: performed.id, setNumber, weightLb: Number(weight), reps: Number(reps), completedAt: new Date().toISOString() })
    }
  }
  const repeat = () => { if (prior) { setWeight(prior.weightLb); setReps(prior.reps) } }
  return <div className="set-row">
    <strong style={{ textAlign: 'center' }}>{setNumber}</strong>
    <input className="set-input" aria-label={`Set ${setNumber} weight in pounds`} type="number" min="0" step="0.5" inputMode="decimal" value={weight} disabled={Boolean(existing)} onChange={(event) => setWeight(Number(event.target.value))} />
    <span>×</span>
    <input className="set-input" aria-label={`Set ${setNumber} repetitions`} type="number" min="0" inputMode="numeric" value={reps} disabled={Boolean(existing)} onChange={(event) => setReps(Number(event.target.value))} />
    <button className={`set-check ${existing ? 'complete' : ''}`} aria-label={existing ? `Undo set ${setNumber}` : `Complete set ${setNumber}`} onClick={complete}>{existing ? <Check size={20} /> : <span>Done</span>}</button>
    {!existing && setNumber > 1 && <button className="link-button" style={{ gridColumn: '2 / 6', textAlign: 'left', fontSize: '.75rem' }} onClick={repeat}><Repeat2 size={13} style={{ display: 'inline', marginRight: 5 }} />Repeat last set</button>}
  </div>
}

export function WorkoutPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const session = useLiveQuery(() => db.planSessions.get(sessionId), [sessionId])
  const template = useLiveQuery(async () => session?.workoutTemplateId ? db.workoutTemplates.get(session.workoutTemplateId) : undefined, [session?.workoutTemplateId])
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? []
  const workoutLogs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const activeLog = workoutLogs.find((log) => log.planSessionId === sessionId && log.status === 'in_progress')
  const setLogs = useLiveQuery<SetLog[]>(() => activeLog ? db.setLogs.where('workoutLogId').equals(activeLog.id).toArray() : Promise.resolve([] as SetLog[]), [activeLog?.id]) ?? []
  const allSetLogs = useLiveQuery(() => db.setLogs.toArray(), []) ?? []
  const [warmup, setWarmup] = useState(true)
  const [index, setIndex] = useState(0)
  const [substituteOpen, setSubstituteOpen] = useState(false)
  const [performedIds, setPerformedIds] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const created = useRef(false)

  useEffect(() => {
    if (!session || activeLog || created.current || session.status === 'completed') return
    created.current = true
    db.transaction('rw', db.workoutLogs, async () => {
      const found = await db.workoutLogs.where('planSessionId').equals(session.id).filter((log) => log.status === 'in_progress').first()
      if (!found) await db.workoutLogs.add({ id: crypto.randomUUID(), planSessionId: session.id, templateId: session.workoutTemplateId!, startedAt: new Date().toISOString(), completedAt: null, status: 'in_progress', notes: null })
    }).catch(() => { created.current = false })
  }, [session, activeLog])

  useEffect(() => {
    if (setLogs.length) setWarmup(false)
  }, [setLogs.length])

  useEffect(() => {
    if (!activeLog) return
    const started = new Date(activeLog.startedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [activeLog?.id])

  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    if (wakeLock) wakeLock.request('screen').then((value) => { lock = value }).catch(() => undefined)
    return () => { lock?.release().catch(() => undefined) }
  }, [])

  const plannedExercises = useMemo(() => template?.exerciseDefinitions.map((id) => exercises.find((exercise) => exercise.id === id)).filter(Boolean) as Exercise[] ?? [], [template, exercises])
  useEffect(() => {
    if (!plannedExercises.length || !setLogs.length) return
    const next = plannedExercises.findIndex((exercise) => {
      const reduction = session?.notes?.includes('reduced volume') || session?.notes?.startsWith('Taper') ? 1 : 0
      return setLogs.filter((set) => set.plannedExerciseId === exercise.id).length < Math.max(1, exercise.targetSets - reduction)
    })
    if (next >= 0) setIndex((current) => current === 0 ? next : current)
  }, [plannedExercises.length, activeLog?.id])

  if (session === undefined || template === undefined || !activeLog) return <div className="loading"><div className="loading-mark"><Dumbbell /></div></div>
  if (!session || !template) return <main className="page"><h1>Workout not found</h1><Button onClick={() => navigate('/plan')}>Back to plan</Button></main>
  if (session.status === 'completed') return <main className="page"><h1>Workout complete</h1><p>This session is already safely in your history.</p><Button onClick={() => navigate('/progress')}>See progress</Button></main>

  if (warmup) return <main className="page workout-page">
    <div className="workout-top"><button className="icon-button" aria-label="Close workout" onClick={() => navigate('/today')}><X /></button><Chip tone="green"><Clock3 size={12} style={{ marginRight: 4 }} />{formatElapsed(elapsed)}</Chip></div>
    <p className="eyebrow">Five-minute warm-up</p><h1 className="page-title">Get ready,<br />not exhausted.</h1>
    <p className="page-intro">Skip or adjust any warm-up movement that is painful. These steps do not need individual checkoffs.</p>
    <Card><ol className="warmup-list">{template.warmupSteps.map((step) => <li key={step}>{step}</li>)}</ol></Card>
    <Button style={{ width: '100%', marginTop: 16 }} onClick={() => setWarmup(false)}>Start main workout</Button>
  </main>

  const planned = plannedExercises[index]
  if (!planned) return null
  const performedId = performedIds[planned.id] ?? setLogs.find((set) => set.plannedExerciseId === planned.id)?.performedExerciseId ?? planned.id
  const performed = exercises.find((exercise) => exercise.id === performedId) ?? planned
  const recommendation = recommendLoad(performed, workoutLogs, allSetLogs)
  const reduceSets = session.notes?.includes('reduced volume') || session.notes?.startsWith('Taper')
  const targetSets = Math.max(1, planned.targetSets - (reduceSets ? 1 : 0))
  const exerciseSets = setLogs.filter((set) => set.plannedExerciseId === planned.id).sort((a, b) => a.setNumber - b.setNumber)
  const completeExercise = exerciseSets.length >= targetSets
  const totalNeeded = plannedExercises.reduce((sum, exercise) => sum + Math.max(1, exercise.targetSets - (reduceSets ? 1 : 0)), 0)
  const workoutComplete = setLogs.length >= totalNeeded
  const finish = async () => {
    if (!workoutComplete && !window.confirm('Finish this workout before every prescribed set is logged? Partial work will remain in history.')) return
    const finishedAt = new Date().toISOString()
    await db.transaction('rw', [db.workoutLogs, db.planSessions], async () => {
      await db.workoutLogs.update(activeLog.id, { status: 'completed', completedAt: finishedAt })
      await db.planSessions.update(session.id, { status: 'completed', completedAt: finishedAt })
    })
    notify(`Workout complete · ${setLogs.length} sets logged.`)
    navigate('/today')
  }
  const substituteOptions = planned.substituteExerciseIds.map((id) => exercises.find((exercise) => exercise.id === id)).filter(Boolean) as Exercise[]

  return <main className="page workout-page">
    <div className="workout-top"><button className="icon-button" aria-label="Close and preserve workout draft" onClick={() => navigate('/today')}><X /></button><div style={{ display: 'flex', gap: 8 }}><Chip tone="neutral">{index + 1} / {plannedExercises.length}</Chip><Chip tone="green"><Clock3 size={12} style={{ marginRight: 4 }} />{formatElapsed(elapsed)}</Chip></div></div>
    <div className="exercise-progress">{plannedExercises.map((_, itemIndex) => <span key={itemIndex} className={itemIndex < index || (itemIndex === index && completeExercise) ? 'done' : ''} />)}</div>
    <p className="eyebrow">{performed.id !== planned.id ? `Substitute for ${planned.name}` : `Exercise ${index + 1}`}</p>
    <h1 className="exercise-title display">{performed.name}</h1>
    <p className="subtle">{targetSets} sets · {performed.repMin}–{performed.repMax} reps</p>
    <Button className="button-small" variant="secondary" onClick={() => setSubstituteOpen(true)}><Shuffle size={14} style={{ display: 'inline', marginRight: 5 }} />Substitute</Button>
    <div className="suggestion">{recommendation.lastSummary && <span>Last time: {recommendation.lastSummary}</span>}<strong>Suggested today: {recommendation.weightLb || 'Choose a starting load'}{recommendation.weightLb ? ' lb' : ''}</strong>{recommendation.reason === 'deload' && <small>Three declining sessions at the same load suggest a small, comfortable deload.</small>}</div>
    <div className="set-list">
      <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 22px 1fr 50px', gap: 8, color: '#756f64', fontSize: '.7rem', textAlign: 'center', textTransform: 'uppercase', fontWeight: 800 }}><span>Set</span><span>lb</span><span></span><span>Reps</span><span></span></div>
      {Array.from({ length: targetSets }, (_, setIndex) => <SetEntry key={`${planned.id}-${setIndex}`} workoutId={activeLog.id} planned={planned} performed={performed} setNumber={setIndex + 1} recommendation={recommendation} existing={exerciseSets.find((set) => set.setNumber === setIndex + 1)} prior={exerciseSets.find((set) => set.setNumber === setIndex)} />)}
    </div>
    <div className="workout-nav"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={17} /></Button>{index < plannedExercises.length - 1 ? <Button disabled={!completeExercise} onClick={() => setIndex(index + 1)}>Next exercise <ChevronRight size={17} style={{ display: 'inline', marginLeft: 4 }} /></Button> : <Button disabled={!workoutComplete} onClick={finish}>Finish workout <Check size={17} style={{ display: 'inline', marginLeft: 4 }} /></Button>}</div>
    <p className="subtle" style={{ textAlign: 'center', marginTop: 14 }}>Your draft saves after every completed set.</p>
    {substituteOpen && <Modal title="Choose a substitute" onClose={() => setSubstituteOpen(false)}><p className="subtle">Occupied equipment should not interrupt the workout. Your history records the exercise actually performed.</p><div className="list"><button className="list-row" onClick={() => { setPerformedIds({ ...performedIds, [planned.id]: planned.id }); setSubstituteOpen(false) }} style={{ width: '100%', color: 'inherit', textAlign: 'left' }}><div className="list-row-main"><strong>{planned.name}</strong><p>Planned exercise</p></div>{performed.id === planned.id && <Check />}</button>{substituteOptions.map((option) => <button className="list-row" key={option.id} onClick={() => { setPerformedIds({ ...performedIds, [planned.id]: option.id }); setSubstituteOpen(false) }} style={{ width: '100%', color: 'inherit', textAlign: 'left' }}><div className="list-row-main"><strong>{option.name}</strong><p>{option.repMin}–{option.repMax} reps</p></div>{performed.id === option.id && <Check />}</button>)}</div></Modal>}
  </main>
}
