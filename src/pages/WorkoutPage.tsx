import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight, Clock3, Dumbbell, Eye, Repeat2, Shuffle, Sparkles, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../data/db'
import { formatExerciseLoad, recommendLoad } from '../domain/progression'
import { completedSetsFor, exerciseIsComplete, prescribedSets, usesReducedStrengthVolume, workoutIsComplete } from '../domain/workouts'
import type { Exercise, SetLog, WorkoutLog, WorkoutTemplate } from '../domain/types'
import { useToast } from '../components/toast-context'
import { Button, Card, Chip, Modal } from '../components/ui'

type WorkoutStage = 'choose' | 'preview' | 'warmup' | 'exercise'
const templateOrder: Record<string, number> = { 'template-full-body': 0, 'template-machine-only': 1, 'template-band-only': 2 }

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function TemplateExerciseList({ template, exercises, reducedVolume = false }: {
  template: WorkoutTemplate
  exercises: Exercise[]
  reducedVolume?: boolean
}) {
  const planned = template.exerciseDefinitions.map((id) => exercises.find((exercise) => exercise.id === id)).filter(Boolean) as Exercise[]
  return <ol className="workout-preview-list">
    {planned.map((exercise, index) => <li key={exercise.id}>
      <span>{index + 1}</span>
      <div><strong>{exercise.name}</strong><small>{prescribedSets(exercise, reducedVolume)} sets · {exercise.repMin}–{exercise.repMax} reps</small></div>
    </li>)}
  </ol>
}

function SetEntry({ workoutId, planned, performed, setNumber, recommendation, existing, prior }: {
  workoutId: string
  planned: Exercise
  performed: Exercise
  setNumber: number
  recommendation: ReturnType<typeof recommendLoad>
  existing?: SetLog
  prior?: SetLog
}) {
  const [weight, setWeight] = useState(existing?.weightLb ?? recommendation.weightLb)
  const [reps, setReps] = useState(existing?.reps ?? performed.repMin)
  useEffect(() => {
    if (!existing) {
      setWeight(recommendation.weightLb)
      setReps(performed.repMin)
    }
  }, [performed.id, recommendation.weightLb, existing])
  const complete = async () => {
    if (existing) {
      await db.setLogs.delete(existing.id)
    } else {
      await db.setLogs.add({ id: crypto.randomUUID(), workoutLogId: workoutId, plannedExerciseId: planned.id, performedExerciseId: performed.id, setNumber, weightLb: Number(weight), reps: Number(reps), completedAt: new Date().toISOString() })
    }
  }
  const repeat = () => {
    if (prior) {
      setWeight(prior.weightLb)
      setReps(prior.reps)
    }
  }
  return <div className="set-row">
    <strong style={{ textAlign: 'center' }}>{setNumber}</strong>
    <input className="set-input" aria-label={performed.loadUnit === 'band_level' ? `Set ${setNumber} band resistance level` : `Set ${setNumber} weight in pounds`} type="number" min={performed.loadUnit === 'band_level' ? 1 : 0} step={performed.loadUnit === 'band_level' ? 1 : 0.5} inputMode="decimal" value={weight} disabled={Boolean(existing)} onChange={(event) => setWeight(Number(event.target.value))} />
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
  const templates = useLiveQuery(async () => (await db.workoutTemplates.toArray()).filter((item) => item.active).sort((a, b) => (templateOrder[a.id] ?? 99) - (templateOrder[b.id] ?? 99)), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const workoutLogs = useLiveQuery(() => db.workoutLogs.toArray(), [])
  const activeLog = workoutLogs?.find((log) => log.planSessionId === sessionId && log.status === 'in_progress')
  const setLogsQuery = useLiveQuery<SetLog[]>(() => activeLog ? db.setLogs.where('workoutLogId').equals(activeLog.id).toArray() : Promise.resolve([] as SetLog[]), [activeLog?.id])
  const allSetLogs = useLiveQuery(() => db.setLogs.toArray(), [])
  const [stage, setStage] = useState<WorkoutStage>('choose')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [substituteOpen, setSubstituteOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [performedIds, setPerformedIds] = useState<Record<string, string>>({})
  const [elapsed, setElapsed] = useState(0)
  const resumedLog = useRef<string | null>(null)

  const setLogs = setLogsQuery ?? []
  const selectedId = activeLog?.templateId ?? selectedTemplateId ?? session?.workoutTemplateId ?? null
  const template = templates?.find((item) => item.id === selectedId)
  const plannedExercises = useMemo(() => template?.exerciseDefinitions.map((id) => exercises?.find((exercise) => exercise.id === id)).filter(Boolean) as Exercise[] ?? [], [template, exercises])
  const reducedVolume = usesReducedStrengthVolume(session?.notes)

  useEffect(() => {
    if (!activeLog || setLogsQuery === undefined || resumedLog.current === activeLog.id) return
    resumedLog.current = activeLog.id
    setSelectedTemplateId(activeLog.templateId)
    if (setLogs.length) {
      const next = plannedExercises.findIndex((exercise) => !exerciseIsComplete(exercise, setLogs, reducedVolume))
      setIndex(next >= 0 ? next : 0)
      setStage('exercise')
    } else {
      setStage('warmup')
    }
  }, [activeLog?.id, setLogsQuery, plannedExercises.length, reducedVolume])

  useEffect(() => {
    if (!activeLog) return
    const started = new Date(activeLog.startedAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [activeLog?.id])

  useEffect(() => {
    if (!activeLog) return
    let lock: { release: () => Promise<void> } | undefined
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    if (wakeLock) wakeLock.request('screen').then((value) => { lock = value }).catch(() => undefined)
    return () => { lock?.release().catch(() => undefined) }
  }, [activeLog?.id])

  if (session === undefined || templates === undefined || exercises === undefined || workoutLogs === undefined || allSetLogs === undefined) return <div className="loading"><div className="loading-mark"><Dumbbell /></div></div>
  if (!session) return <main className="page"><h1>Workout not found</h1><Button onClick={() => navigate('/plan')}>Back to plan</Button></main>
  if (session.status === 'completed') return <main className="page"><h1>Workout complete</h1><p>This session is already safely in your history.</p><Button onClick={() => navigate('/progress')}>See progress</Button></main>

  const chooseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setStage('preview')
    window.scrollTo(0, 0)
  }

  const startWorkout = async () => {
    if (!template) return
    await db.transaction('rw', db.workoutLogs, async () => {
      const found = await db.workoutLogs.where('planSessionId').equals(session.id).filter((log) => log.status === 'in_progress').first()
      if (!found) await db.workoutLogs.add({ id: crypto.randomUUID(), planSessionId: session.id, templateId: template.id, startedAt: new Date().toISOString(), completedAt: null, status: 'in_progress', notes: null })
    })
    setStage('warmup')
    window.scrollTo(0, 0)
  }

  if (!activeLog && stage === 'choose') return <main className="page workout-page">
    <div className="workout-top"><button className="icon-button" aria-label="Close workout" onClick={() => navigate('/today')}><X /></button><Chip tone="neutral">Not started</Chip></div>
    <p className="eyebrow">Today’s strength</p>
    <h1 className="page-title">Choose your setup.</h1>
    <p className="page-intro">The movement balance stays consistent. Pick the equipment that makes today easiest to complete.</p>
    <div className="workout-template-rail">
      {templates.map((item) => {
        const itemExercises = item.exerciseDefinitions.map((id) => exercises.find((exercise) => exercise.id === id)).filter(Boolean) as Exercise[]
        return <Card className={`workout-template-card ${item.id === session.workoutTemplateId ? 'recommended' : ''}`} key={item.id}>
          <div className="template-card-top"><Chip tone={item.id === session.workoutTemplateId ? 'green' : 'neutral'}>{item.id === session.workoutTemplateId ? 'Default' : item.equipment}</Chip><Sparkles size={18} /></div>
          <h2>{item.name}</h2>
          <p>{item.description}</p>
          <ul>{itemExercises.map((exercise) => <li key={exercise.id}>{exercise.name}</li>)}</ul>
          <Button style={{ width: '100%' }} onClick={() => chooseTemplate(item.id)}>Preview this workout <ChevronRight size={16} style={{ display: 'inline', marginLeft: 4 }} /></Button>
        </Card>
      })}
    </div>
    <p className="subtle template-safety">All three cover lower body, pushing, and pulling. Band exercises require a secure, undamaged anchor.</p>
  </main>

  if (!activeLog && stage === 'preview' && template) return <main className="page workout-page">
    <div className="workout-top"><button className="icon-button" aria-label="Choose another workout" onClick={() => setStage('choose')}><ChevronLeft /></button><Chip tone="neutral">Preview</Chip></div>
    <p className="eyebrow">{template.equipment}</p>
    <h1 className="page-title">{template.name}</h1>
    <p className="page-intro">Review the whole session before the timer or workout log begins.</p>
    <Card className="workout-plan-card"><div className="plan-card-heading"><div><span className="eyebrow">Main workout</span><h2>Six movements</h2></div><Chip tone="green">About 45 min</Chip></div><TemplateExerciseList template={template} exercises={exercises} reducedVolume={reducedVolume} /></Card>
    <Card className="warmup-preview-card"><span className="eyebrow">Before the work sets</span><h2>Dynamic warm-up</h2><p className="subtle">About 6–8 minutes, followed by 1–2 light practice sets before the first challenging lower- and upper-body exercise.</p></Card>
    <Button style={{ width: '100%', marginTop: 16 }} onClick={startWorkout}>Start warm-up</Button>
    <Button style={{ width: '100%', marginTop: 8 }} variant="ghost" onClick={() => setStage('choose')}>Choose another template</Button>
  </main>

  if (!template || !activeLog) return <div className="loading"><div className="loading-mark"><Dumbbell /></div></div>

  if (stage === 'warmup') return <main className="page workout-page">
    <div className="workout-top"><button className="icon-button" aria-label="Close workout" onClick={() => navigate('/today')}><X /></button><div className="workout-top-actions"><button className="link-button" onClick={() => setPlanOpen(true)}><Eye size={14} /> Plan</button><Chip tone="green"><Clock3 size={12} style={{ marginRight: 4 }} />{formatElapsed(elapsed)}</Chip></div></div>
    <p className="eyebrow">6–8 minute dynamic warm-up</p><h1 className="page-title">Get ready,<br />not exhausted.</h1>
    <p className="page-intro">Move through a comfortable range without long holds. Skip or adjust anything painful; this should raise temperature and rehearse today’s patterns, not create fatigue.</p>
    <Card><ol className="warmup-list">{template.warmupSteps.map((step) => <li key={step}>{step}</li>)}</ol></Card>
    <div className="notice" style={{ marginTop: 14 }}><strong>Ramp up the lifts, too.</strong><br />Before the first challenging lower- and upper-body work set, do 1–2 lighter practice sets with the same movement.</div>
    <Button style={{ width: '100%', marginTop: 16 }} onClick={() => setStage('exercise')}>Start main workout</Button>
    {planOpen && <Modal title="Today’s full workout" onClose={() => setPlanOpen(false)}><TemplateExerciseList template={template} exercises={exercises} reducedVolume={reducedVolume} /></Modal>}
  </main>

  const planned = plannedExercises[index]
  if (!planned) return null
  const performedId = performedIds[planned.id] ?? setLogs.find((set) => set.plannedExerciseId === planned.id)?.performedExerciseId ?? planned.id
  const performed = exercises.find((exercise) => exercise.id === performedId) ?? planned
  const recommendation = recommendLoad(performed, workoutLogs, allSetLogs)
  const targetSets = prescribedSets(planned, reducedVolume)
  const exerciseSets = setLogs.filter((set) => set.plannedExerciseId === planned.id).sort((a, b) => a.setNumber - b.setNumber)
  const completeExercise = exerciseIsComplete(planned, setLogs, reducedVolume)
  const workoutComplete = workoutIsComplete(plannedExercises, setLogs, reducedVolume)
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
    <div className="workout-top"><button className="icon-button" aria-label="Close and preserve workout draft" onClick={() => navigate('/today')}><X /></button><div className="workout-top-actions"><button className="link-button" onClick={() => setPlanOpen(true)}><Eye size={14} /> Plan</button><Chip tone="green"><Clock3 size={12} style={{ marginRight: 4 }} />{formatElapsed(elapsed)}</Chip></div></div>
    <div className="exercise-progress">{plannedExercises.map((exercise) => <span key={exercise.id} className={exerciseIsComplete(exercise, setLogs, reducedVolume) ? 'done' : ''} />)}</div>
    <div className="exercise-map" aria-label="Jump to exercise">
      {plannedExercises.map((exercise, itemIndex) => {
        const completed = completedSetsFor(exercise.id, setLogs)
        const prescribed = prescribedSets(exercise, reducedVolume)
        return <button key={exercise.id} className={`${itemIndex === index ? 'active' : ''} ${completed >= prescribed ? 'complete' : ''}`} aria-current={itemIndex === index ? 'step' : undefined} onClick={() => setIndex(itemIndex)}><span>{itemIndex + 1}</span><strong>{exercise.name}</strong><small>{completed}/{prescribed}</small></button>
      })}
    </div>
    <p className="eyebrow">{performed.id !== planned.id ? `Substitute for ${planned.name}` : `Exercise ${index + 1}`}</p>
    <h1 className="exercise-title display">{performed.name}</h1>
    <p className="subtle">{targetSets} sets · {performed.repMin}–{performed.repMax} reps</p>
    <Button className="button-small" variant="secondary" onClick={() => setSubstituteOpen(true)}><Shuffle size={14} style={{ display: 'inline', marginRight: 5 }} />Substitute</Button>
    <div className="suggestion">{recommendation.lastSummary && <span>Last time: {recommendation.lastSummary}</span>}<strong>Suggested today: {recommendation.reason === 'start' && performed.loadUnit === 'lb' ? 'Choose a starting load' : formatExerciseLoad(performed, recommendation.weightLb)}</strong>{recommendation.reason === 'deload' && <small>Three declining sessions at the same load suggest a small, comfortable deload.</small>}</div>
    <div className="set-list">
      <div className="set-list-head"><span>Set</span><span>{performed.loadUnit === 'band_level' ? 'Level' : 'lb'}</span><span></span><span>Reps</span><span></span></div>
      {Array.from({ length: targetSets }, (_, setIndex) => <SetEntry key={`${planned.id}-${setIndex}`} workoutId={activeLog.id} planned={planned} performed={performed} setNumber={setIndex + 1} recommendation={recommendation} existing={exerciseSets.find((set) => set.setNumber === setIndex + 1)} prior={exerciseSets.find((set) => set.setNumber === setIndex)} />)}
    </div>
    <div className="workout-nav"><Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft size={17} /></Button>{index < plannedExercises.length - 1 ? <Button onClick={() => setIndex(index + 1)}>Next exercise <ChevronRight size={17} style={{ display: 'inline', marginLeft: 4 }} /></Button> : <Button onClick={finish}>Finish workout <Check size={17} style={{ display: 'inline', marginLeft: 4 }} /></Button>}</div>
    {!completeExercise && index < plannedExercises.length - 1 && <p className="subtle" style={{ textAlign: 'center', marginTop: 10 }}>Equipment busy? Move on now and return from the exercise map.</p>}
    <p className="subtle" style={{ textAlign: 'center', marginTop: 14 }}>Your draft saves after every completed set.</p>
    {planOpen && <Modal title="Today’s full workout" onClose={() => setPlanOpen(false)}><TemplateExerciseList template={template} exercises={exercises} reducedVolume={reducedVolume} /></Modal>}
    {substituteOpen && <Modal title="Choose a substitute" onClose={() => setSubstituteOpen(false)}><p className="subtle">Occupied equipment should not interrupt the workout. Your history records the exercise actually performed.</p><div className="list"><button className="list-row" onClick={() => { setPerformedIds({ ...performedIds, [planned.id]: planned.id }); setSubstituteOpen(false) }} style={{ width: '100%', color: 'inherit', textAlign: 'left' }}><div className="list-row-main"><strong>{planned.name}</strong><p>Planned exercise</p></div>{performed.id === planned.id && <Check />}</button>{substituteOptions.map((option) => <button className="list-row" key={option.id} onClick={() => { setPerformedIds({ ...performedIds, [planned.id]: option.id }); setSubstituteOpen(false) }} style={{ width: '100%', color: 'inherit', textAlign: 'left' }}><div className="list-row-main"><strong>{option.name}</strong><p>{option.repMin}–{option.repMax} reps · {option.loadUnit === 'band_level' ? 'band level' : 'weighted'}</p></div>{performed.id === option.id && <Check />}</button>)}</div></Modal>}
  </main>
}
