import { useState } from 'react'
import { ArrowRight, Check, Database, Dumbbell, Flag, Sprout, Utensils } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db } from '../data/db'
import type { TrackedMealType } from '../domain/types'
import { Button, Card, Field } from '../components/ui'

const steps = [
  { icon: Database, eyebrow: 'Private by design', title: 'Your plan lives on this device.', body: 'Steady works locally and offline. There is no account, tracking, or cloud sync. Export a backup whenever you want a portable copy.' },
  { icon: Flag, eyebrow: 'Your finish line', title: 'Fourteen steady weeks.', body: 'The plan starts Monday, September 7 and ends at the half marathon on Sunday, December 13, 2026. Runs stay conversational and walking is welcome.' },
  { icon: Dumbbell, eyebrow: 'Simple strength', title: 'The same full-body rhythm.', body: 'Two predictable workouts most weeks make progression clear and keep decisions out of your gym time.' },
  { icon: Utensils, eyebrow: 'Cook more often', title: 'Choose three easy routines.', body: 'Set targets for breakfasts, work lunches, and dinners. Home-prepared includes meal prep, assembled meals, packed lunches, and leftovers.' }
]

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [mealGoals, setMealGoals] = useState<Record<TrackedMealType, number>>({ breakfast: 7, work_lunch: 5, dinner: 5 })
  const navigate = useNavigate()
  const current = steps[step]
  const Icon = current.icon
  const finish = async () => {
    await db.transaction('rw', [db.settings, db.mealGoals], async () => {
      for (const [mealType, targetPerWeek] of Object.entries(mealGoals) as Array<[TrackedMealType, number]>) {
        const goal = await db.mealGoals.where('mealType').equals(mealType).filter((item) => item.effectiveUntil === null).first()
        if (goal) await db.mealGoals.update(goal.id, { targetPerWeek })
      }
      await db.settings.update('app', { onboardingComplete: true, homeMealWeeklyGoal: Object.values(mealGoals).reduce((sum, value) => sum + value, 0) })
    })
    navigate('/today')
  }
  return <main className="page" style={{ minHeight: '100vh', display: 'grid', alignContent: 'center', maxWidth: 620 }}>
    <div className="brand" style={{ marginBottom: 42 }}><span className="brand-mark"><Sprout size={18} /></span>Steady</div>
    <div className="exercise-progress" aria-label={`Onboarding step ${step + 1} of ${steps.length}`}>{steps.map((_, index) => <span key={index} className={index <= step ? 'done' : ''} />)}</div>
    <Card className="hero-card" style={{ minHeight: 350, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div><Icon size={36} style={{ color: '#f4c76b', marginBottom: 30 }} /><p className="eyebrow">{current.eyebrow}</p><h1 className="display" style={{ fontSize: '2.7rem', lineHeight: 1, maxWidth: 480 }}>{current.title}</h1><p>{current.body}</p></div>
      {step === 3 && <div className="onboarding-meal-goals"><Field label="Breakfasts"><input className="input" type="number" inputMode="numeric" min="0" max="7" value={mealGoals.breakfast} onChange={(event) => setMealGoals({ ...mealGoals, breakfast: Number(event.target.value) })} /></Field><Field label="Work lunches"><input className="input" type="number" inputMode="numeric" min="0" max="5" value={mealGoals.work_lunch} onChange={(event) => setMealGoals({ ...mealGoals, work_lunch: Number(event.target.value) })} /></Field><Field label="Dinners"><input className="input" type="number" inputMode="numeric" min="0" max="7" value={mealGoals.dinner} onChange={(event) => setMealGoals({ ...mealGoals, dinner: Number(event.target.value) })} /></Field></div>}
    </Card>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
      <Button variant="ghost" onClick={() => step ? setStep(step - 1) : finish() }>{step ? 'Back' : 'Skip'}</Button>
      <Button onClick={() => step < steps.length - 1 ? setStep(step + 1) : finish()}>{step < steps.length - 1 ? <>Continue <ArrowRight size={17} style={{ display: 'inline', marginLeft: 7 }} /></> : <>Start steady <Check size={17} style={{ display: 'inline', marginLeft: 7 }} /></>}</Button>
    </div>
  </main>
}
