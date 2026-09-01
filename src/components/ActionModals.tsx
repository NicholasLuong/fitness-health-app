import { useState } from 'react'
import { formatISO } from 'date-fns'
import { db } from '../data/db'
import { createFreshItems, normalizeIngredient, parseFreshBatch } from '../domain/kitchen'
import { createHomeMealLog, inferredMealType, localMealDate, mealGoalVersionsForWeek, mealTypeLabels, nextGoalVersion } from '../domain/meals'
import { reviewNextLongRun, type LongRunReview } from '../domain/runAdaptation'
import { defaultMealGoals } from '../domain/seed'
import type { AppSettings, Dish, MealGoal, MealType, PlanSession, RunFeedback, TrackedMealType } from '../domain/types'
import { useToast } from './toast-context'
import { Button, Field, Modal } from './ui'

const feedbackOptions: Array<{ value: RunFeedback; label: string; detail: string }> = [
  { value: 'comfortable', label: 'Comfortable', detail: 'I had more in the tank.' },
  { value: 'challenging', label: 'Challenging but okay', detail: 'Hard, but nothing felt wrong.' },
  { value: 'stopped_early', label: 'Had to stop early', detail: 'I could not safely or sensibly finish.' }
]

export function RunCompleteModal({ session, allSessions, onClose }: { session: PlanSession; allSessions: PlanSession[]; onClose: () => void }) {
  const [distance, setDistance] = useState(session.actualDistanceMiles ?? session.plannedDistanceMiles ?? 0)
  const [feedback, setFeedback] = useState<RunFeedback | null>(session.runFeedback)
  const [review, setReview] = useState<LongRunReview | null>(null)
  const { notify } = useToast()

  const save = async (acceptAdjustment = false) => {
    await db.transaction('rw', db.planSessions, async () => {
      await db.planSessions.update(session.id, { status: 'completed', actualDistanceMiles: distance, runFeedback: feedback, completedAt: new Date().toISOString() })
      if (acceptAdjustment && review?.kind === 'adjust') {
        await db.planSessions.update(review.nextSession.id, { plannedDistanceMiles: review.suggestedDistance, adjustedFromSessionId: session.id })
      }
    })
    notify(acceptAdjustment && review?.kind === 'adjust' ? `Run saved. Next long run adjusted to ${review.suggestedDistance} miles.` : review?.kind === 'buffer' ? 'Run saved. Your recovery week stays protected.' : 'Run saved. Every honest mile counts.')
    onClose()
  }

  const continueToReview = () => {
    if (!feedback) return
    const nextReview = reviewNextLongRun(session, distance, feedback, allSessions)
    if (nextReview.kind === 'none') {
      setReview(nextReview)
      void save()
      return
    }
    setReview(nextReview)
  }

  if (review?.kind === 'buffer') return <Modal title="Your buffer is working" onClose={onClose}>
    <p className="subtle">{review.message}</p>
    <div className="adaptation-card"><strong>No catch-up miles</strong><span>The recovery week stays exactly as planned. The week after it also remains unchanged.</span></div>
    <div className="modal-actions"><Button variant="ghost" onClick={() => setReview(null)}>Back</Button><Button onClick={() => save()}>Finish</Button></div>
  </Modal>

  if (review?.kind === 'adjust') {
    const original = review.nextSession.plannedDistanceMiles
    return <Modal title="Protect next week" onClose={onClose}>
      <p className="subtle">{review.message}</p>
      <div className="distance-comparison" aria-label={`Suggested next long run: ${review.suggestedDistance} miles instead of ${original} miles`}>
        <div><span>Original</span><strong>{original} mi</strong></div><div className="distance-arrow">→</div><div className="suggested"><span>Suggested</span><strong>{review.suggestedDistance} mi</strong></div>
      </div>
      <div className="adaptation-card"><strong>Only next week changes</strong><span>Nothing stacks up, recovery weeks stay protected, and the following week returns to the original plan.</span></div>
      {feedback === 'stopped_early' && <p className="safety-note">If pain—not ordinary effort—made you stop, pause running rather than training through it and seek appropriate medical guidance if it persists.</p>}
      <div className="modal-actions"><Button variant="ghost" onClick={() => setReview(null)}>Back</Button><Button variant="secondary" onClick={() => save(false)}>Keep {original} mi</Button><Button onClick={() => save(true)}>Use {review.suggestedDistance} mi</Button></div>
    </Modal>
  }

  return <Modal title={`Complete ${session.title}`} onClose={onClose}>
    <p className="subtle">Planned: {session.plannedDistanceMiles} miles · Easy, conversational effort; walking is allowed.</p>
    <Field label="Actual distance" hint="A partial run still counts as completed."><input className="input" type="number" min="0" step="0.1" inputMode="decimal" autoFocus value={distance} onChange={(event) => setDistance(Number(event.target.value))} /></Field>
    <fieldset className="effort-fieldset"><legend>How did that feel?</legend><div className="effort-options">{feedbackOptions.map((option) => <button type="button" className={feedback === option.value ? 'selected' : ''} aria-pressed={feedback === option.value} key={option.value} onClick={() => setFeedback(option.value)}><strong>{option.label}</strong><span>{option.detail}</span></button>)}</div></fieldset>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!feedback || !Number.isFinite(distance) || distance < 0} onClick={continueToReview}>{session.type === 'long_run' ? 'Review next week' : 'Complete run'}</Button></div>
  </Modal>
}

export function FreshBatchModal({ settings, onClose }: { settings: AppSettings; onClose: () => void }) {
  const [value, setValue] = useState('')
  const { notify } = useToast()
  const parsed = parseFreshBatch(value)
  const save = async () => {
    await db.freshItems.bulkAdd(createFreshItems(value, new Date(), settings.freshItemAttentionDays))
    notify(`${parsed.length} fresh ${parsed.length === 1 ? 'item' : 'items'} added.`)
    onClose()
  }
  return <Modal title="Add fresh groceries" onClose={onClose}>
    <p className="subtle">Use commas, semicolons, or new lines. Quantities are intentionally optional.</p>
    <Field label="Fresh ingredients" hint={parsed.length ? `${parsed.length} item${parsed.length === 1 ? '' : 's'} ready to add` : 'Try: spinach, mushrooms, chicken thighs'}><textarea className="input" autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder={'Spinach, mushrooms\nChicken thighs'} /></Field>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!parsed.length} onClick={save}>{parsed.length ? `Add ${parsed.length} ${parsed.length === 1 ? 'item' : 'items'}` : 'Add items'}</Button></div>
  </Modal>
}

export function MealLogModal({ dishes, selectedDishId = null, defaultMealType = inferredMealType(), onClose }: { dishes: Dish[]; selectedDishId?: string | null; defaultMealType?: MealType; onClose: () => void }) {
  const [dishId, setDishId] = useState(selectedDishId ?? '')
  const [leftovers, setLeftovers] = useState(false)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const { notify } = useToast()
  const save = async () => {
    const now = new Date()
    if (mealType !== 'other') {
      const existing = await db.mealLogs.where('mealDate').equals(localMealDate(now)).filter((meal) => meal.type === 'home_prepared' && meal.mealType === mealType).first()
      if (existing) {
        notify(`${mealTypeLabels[mealType]} is already counted today.`)
        onClose()
        return
      }
    }
    await db.mealLogs.add(createHomeMealLog({ mealType, dishId: dishId || null, leftovers, now }))
    notify(leftovers ? `${mealTypeLabels[mealType]} logged. Leftovers count.` : `${mealTypeLabels[mealType]} logged.`)
    onClose()
  }
  return <Modal title={`Log ${mealType === 'other' ? 'home meal' : mealTypeLabels[mealType].toLowerCase()}`} onClose={onClose}>
    <Field label="Meal"><select className="input" value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}><option value="breakfast">Breakfast</option><option value="work_lunch">Work lunch</option><option value="dinner">Dinner</option><option value="other">Other home meal</option></select></Field>
    <Field label="Dish (optional)"><select className="input" value={dishId} onChange={(event) => setDishId(event.target.value)}><option value="">No dish selected</option>{dishes.map((dish) => <option value={dish.id} key={dish.id}>{dish.name}</option>)}</select></Field>
    <label className="check-row"><input type="checkbox" checked={leftovers} onChange={(event) => setLeftovers(event.target.checked)} /> This meal was leftovers</label>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Log meal</Button></div>
  </Modal>
}

export function MealGoalsModal({ goals, onClose }: { goals: MealGoal[]; onClose: () => void }) {
  const current = mealGoalVersionsForWeek(goals, localMealDate(new Date()))
  const starting = (mealType: TrackedMealType) => current.find((goal) => goal.mealType === mealType) ?? defaultMealGoals.find((goal) => goal.mealType === mealType)!
  const [values, setValues] = useState<Record<TrackedMealType, { target: number; enabled: boolean }>>({
    breakfast: { target: starting('breakfast').targetPerWeek, enabled: starting('breakfast').enabled },
    work_lunch: { target: starting('work_lunch').targetPerWeek, enabled: starting('work_lunch').enabled },
    dinner: { target: starting('dinner').targetPerWeek, enabled: starting('dinner').enabled }
  })
  const { notify } = useToast()
  const definitions: Array<{ mealType: TrackedMealType; label: string; hint: string; max: number; weekdays: number[] }> = [
    { mealType: 'breakfast', label: 'Breakfasts', hint: 'Any day · one credit per day', max: 7, weekdays: [1, 2, 3, 4, 5, 6, 7] },
    { mealType: 'work_lunch', label: 'Work lunches', hint: 'Monday–Friday · packed meals and leftovers count', max: 5, weekdays: [1, 2, 3, 4, 5] },
    { mealType: 'dinner', label: 'Dinners', hint: 'Any day · choose how many of seven', max: 7, weekdays: [1, 2, 3, 4, 5, 6, 7] }
  ]
  const save = async () => {
    const changes = definitions.map((definition) => nextGoalVersion(goals, {
      mealType: definition.mealType, label: definition.label, targetPerWeek: Math.min(definition.max, Math.max(0, values[definition.mealType].target)),
      eligibleWeekdays: definition.weekdays, enabled: values[definition.mealType].enabled
    }))
    await db.transaction('rw', [db.mealGoals, db.settings], async () => {
      for (const change of changes) {
        if (change.close) await db.mealGoals.update(change.close.id, { effectiveUntil: change.close.effectiveUntil, updatedAt: change.close.updatedAt })
        await db.mealGoals.put(change.goal)
      }
      const total = changes.reduce((sum, change) => sum + (change.goal.enabled ? change.goal.targetPerWeek : 0), 0)
      await db.settings.update('app', { homeMealWeeklyGoal: Math.max(1, total) })
    })
    notify('Meal commitments saved for this week forward.')
    onClose()
  }
  return <Modal title="Meal commitments" onClose={onClose}>
    <p className="subtle">Track only the routines you care about. One meal fills one daily slot; extra home meals still remain in your total history.</p>
    <div className="meal-goal-editor">{definitions.map((definition) => <div className="meal-goal-edit" key={definition.mealType}>
      <label className="check-row"><input type="checkbox" checked={values[definition.mealType].enabled} onChange={(event) => setValues({ ...values, [definition.mealType]: { ...values[definition.mealType], enabled: event.target.checked } })} /><span><strong>{definition.label}</strong><small>{definition.hint}</small></span></label>
      <input className="input meal-target-input" aria-label={`${definition.label} per week`} type="number" inputMode="numeric" min="0" max={definition.max} disabled={!values[definition.mealType].enabled} value={values[definition.mealType].target} onChange={(event) => setValues({ ...values, [definition.mealType]: { ...values[definition.mealType], target: Number(event.target.value) } })} />
    </div>)}</div>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>Save commitments</Button></div>
  </Modal>
}

export function DishModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [notes, setNotes] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [favorite, setFavorite] = useState(false)
  const { notify } = useToast()
  const save = async () => {
    const now = new Date().toISOString()
    await db.dishes.add({
      id: crypto.randomUUID(), name: name.trim(),
      ingredients: parseFreshBatch(ingredients).map((displayName) => ({ displayName, normalizedName: normalizeIngredient(displayName) })),
      notes: notes.trim() || null, sourceUrl: sourceUrl.trim() || null, photoRef: null,
      wouldMakeAgain: favorite || null, createdAt: now, updatedAt: now
    })
    notify(`${name.trim()} saved.`)
    onClose()
  }
  return <Modal title="Save a dish" onClose={onClose}>
    <Field label="Dish name"><input className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Chicken and mushroom skillet" /></Field>
    <Field label="Key fresh ingredients" hint="Comma or new-line separated. Ordinary staples can stay off the list."><textarea className="input" value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="Chicken thighs, mushrooms, spinach" /></Field>
    <Field label="Short notes (optional)"><textarea className="input" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
    <Field label="Source URL (optional)"><input className="input" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></Field>
    <label className="check-row"><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} /> I would make this again</label>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!name.trim()} onClick={save}>Save dish</Button></div>
  </Modal>
}

export function MeasurementModal({ defaultUnit, onClose }: { defaultUnit: 'pounds' | 'kilograms'; onClose: () => void }) {
  const [type, setType] = useState<'weight' | 'waist'>('weight')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<'lb' | 'kg' | 'in' | 'cm'>(defaultUnit === 'pounds' ? 'lb' : 'kg')
  const { notify } = useToast()
  const switchType = (next: 'weight' | 'waist') => { setType(next); setUnit(next === 'weight' ? (defaultUnit === 'pounds' ? 'lb' : 'kg') : 'in') }
  const save = async () => {
    await db.measurements.add({ id: crypto.randomUUID(), type, value: Number(value), unit, measuredAt: formatISO(new Date()), notes: null })
    notify(`${type === 'weight' ? 'Weight' : 'Waist measurement'} logged.`)
    onClose()
  }
  return <Modal title="Log measurement" onClose={onClose}>
    <div className="form-grid"><Button variant={type === 'weight' ? 'primary' : 'secondary'} onClick={() => switchType('weight')}>Weight</Button><Button variant={type === 'waist' ? 'primary' : 'secondary'} onClick={() => switchType('waist')}>Waist</Button></div>
    <div className="form-grid"><Field label="Value"><input className="input" autoFocus type="number" inputMode="decimal" min="0" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} /></Field><Field label="Unit"><select className="input" value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)}>{type === 'weight' ? <><option value="lb">lb</option><option value="kg">kg</option></> : <><option value="in">in</option><option value="cm">cm</option></>}</select></Field></div>
    <p className="subtle">{type === 'weight' ? 'Individual fluctuations are normal; the longer trend matters more.' : 'Optional and best used no more than monthly.'}</p>
    <div className="modal-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!Number(value)} onClick={save}>Save</Button></div>
  </Modal>
}
