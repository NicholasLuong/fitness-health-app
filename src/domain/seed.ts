import { differenceInCalendarWeeks } from 'date-fns'
import { addCalendarDays, fromISODate, mondayOf, toISODate } from './dates'
import type { AppSettings, Exercise, MealGoal, PlanProgram, PlanSession, WorkoutTemplate } from './types'

export const PROGRAM_ID = 'program-half-2026'
export const TEMPLATE_ID = 'template-full-body'
export const MACHINE_TEMPLATE_ID = 'template-machine-only'
export const BAND_TEMPLATE_ID = 'template-band-only'
export const SCHEMA_VERSION = 4

const stamp = '2026-09-01T00:00:00.000Z'

export const defaultSettings: AppSettings = {
  id: 'app',
  weekStartsOn: 1,
  distanceUnit: 'miles',
  weightUnit: 'pounds',
  homeMealWeeklyGoal: 17,
  freshItemAttentionDays: 7,
  calendarRemindersEnabled: false,
  schemaVersion: SCHEMA_VERSION,
  onboardingComplete: false
}

export const defaultMealGoals: MealGoal[] = [
  { id: 'meal-goal-breakfast-v1', mealType: 'breakfast', label: 'Breakfast', targetPerWeek: 7, eligibleWeekdays: [1, 2, 3, 4, 5, 6, 7], effectiveFrom: '2026-08-31', effectiveUntil: null, enabled: true, createdAt: stamp, updatedAt: stamp },
  { id: 'meal-goal-work-lunch-v1', mealType: 'work_lunch', label: 'Work lunches', targetPerWeek: 5, eligibleWeekdays: [1, 2, 3, 4, 5], effectiveFrom: '2026-08-31', effectiveUntil: null, enabled: true, createdAt: stamp, updatedAt: stamp },
  { id: 'meal-goal-dinner-v1', mealType: 'dinner', label: 'Dinners', targetPerWeek: 5, eligibleWeekdays: [1, 2, 3, 4, 5, 6, 7], effectiveFrom: '2026-08-31', effectiveUntil: null, enabled: true, createdAt: stamp, updatedAt: stamp }
]

export const program: PlanProgram = {
  id: PROGRAM_ID,
  name: 'Comfortable Finish · Half Marathon',
  startDate: '2026-09-07',
  endDate: '2026-12-13',
  status: 'active',
  createdAt: stamp,
  updatedAt: stamp
}

const strengthExercise = (
  id: string,
  name: string,
  movementPattern: string,
  repMin: number,
  repMax: number,
  targetSets: number,
  defaultIncrementLb: number,
  substituteExerciseIds: string[],
  loadUnit: Exercise['loadUnit'] = 'lb'
): Exercise => ({ id, name, movementPattern, loadUnit, repMin, repMax, targetSets, defaultIncrementLb, substituteExerciseIds, optional: false })

export const exercises: Exercise[] = [
  strengthExercise('leg-press', 'Leg press', 'squat', 8, 12, 3, 10, ['goblet-squat', 'band-squat']),
  strengthExercise('goblet-squat', 'Goblet squat to a bench', 'squat', 8, 12, 3, 5, ['leg-press', 'band-squat']),
  strengthExercise('band-squat', 'Banded squat to a bench', 'squat', 10, 15, 3, 1, ['leg-press', 'goblet-squat'], 'band_level'),
  strengthExercise('db-rdl', 'Dumbbell Romanian deadlift', 'hinge', 8, 12, 3, 5, ['back-extension', 'leg-curl-machine', 'band-good-morning']),
  strengthExercise('back-extension', '45-degree back extension', 'hinge', 8, 12, 3, 5, ['db-rdl', 'leg-curl-machine', 'band-good-morning']),
  strengthExercise('leg-curl-machine', 'Seated leg-curl machine', 'knee flexion', 10, 15, 3, 5, ['db-rdl', 'band-good-morning']),
  strengthExercise('band-good-morning', 'Banded good morning', 'hinge', 10, 15, 3, 1, ['db-rdl', 'leg-curl-machine'], 'band_level'),
  strengthExercise('db-bench', 'Dumbbell bench press', 'push', 8, 12, 3, 5, ['chest-press', 'band-chest-press']),
  strengthExercise('chest-press', 'Chest-press machine', 'push', 8, 12, 3, 5, ['db-bench', 'band-chest-press']),
  strengthExercise('band-chest-press', 'Standing band chest press', 'push', 10, 15, 3, 1, ['db-bench', 'chest-press'], 'band_level'),
  strengthExercise('cable-row', 'Seated cable row', 'pull', 8, 12, 3, 5, ['chest-supported-row', 'seated-row-machine', 'band-row']),
  strengthExercise('chest-supported-row', 'Chest-supported dumbbell row', 'pull', 8, 12, 3, 5, ['cable-row', 'seated-row-machine', 'band-row']),
  strengthExercise('seated-row-machine', 'Seated row machine', 'pull', 8, 12, 3, 5, ['cable-row', 'band-row']),
  strengthExercise('band-row', 'Anchored band row', 'pull', 10, 15, 3, 1, ['cable-row', 'seated-row-machine'], 'band_level'),
  strengthExercise('lat-pulldown', 'Lat pulldown', 'vertical pull', 8, 12, 2, 5, ['assisted-pullup', 'band-lat-pulldown']),
  strengthExercise('assisted-pullup', 'Assisted pull-up', 'vertical pull', 8, 12, 2, 5, ['lat-pulldown', 'band-lat-pulldown']),
  strengthExercise('band-lat-pulldown', 'Kneeling band lat pulldown', 'vertical pull', 10, 15, 2, 1, ['lat-pulldown', 'assisted-pullup'], 'band_level'),
  strengthExercise('hip-abduction', 'Hip-abduction machine', 'abduction', 12, 20, 2, 5, ['lateral-band-walk']),
  strengthExercise('lateral-band-walk', 'Lateral band walks', 'abduction', 12, 20, 2, 1, ['hip-abduction'], 'band_level')
]

const dynamicWarmup = [
  'Easy bike or brisk walk — 3 minutes',
  'Bodyweight squat to a bench — 8 controlled reps',
  'Alternating step-back with an overhead reach — 5 each side',
  'Unweighted hip hinge with an arm sweep — 8 reps',
  'Wall slides — 8 controlled reps',
  'Incline push-ups against a bench — 8 reps'
]

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: TEMPLATE_ID,
    name: 'Everyday full body',
    description: 'The default balance of dumbbells, cables, and machines.',
    equipment: 'Gym mix',
    warmupSteps: dynamicWarmup,
    exerciseDefinitions: ['leg-press', 'db-rdl', 'db-bench', 'cable-row', 'lat-pulldown', 'hip-abduction'],
    active: true,
    createdAt: stamp,
    updatedAt: stamp
  },
  {
    id: MACHINE_TEMPLATE_ID,
    name: 'Machine only',
    description: 'Stable stations and pin-loaded resistance; no free weights required.',
    equipment: 'Machines',
    warmupSteps: dynamicWarmup,
    exerciseDefinitions: ['leg-press', 'leg-curl-machine', 'chest-press', 'seated-row-machine', 'lat-pulldown', 'hip-abduction'],
    active: true,
    createdAt: stamp,
    updatedAt: stamp
  },
  {
    id: BAND_TEMPLATE_ID,
    name: 'Resistance bands',
    description: 'A complete portable session using anchored and loop bands.',
    equipment: 'Long band + mini band',
    warmupSteps: [
      'Brisk march or walk — 3 minutes',
      'Bodyweight squat to a bench — 8 controlled reps',
      'Alternating step-back with an overhead reach — 5 each side',
      'Unweighted hip hinge with an arm sweep — 8 reps',
      'Band pull-aparts — 10 controlled reps',
      'Incline push-ups against a wall or bench — 8 reps'
    ],
    exerciseDefinitions: ['band-squat', 'band-good-morning', 'band-chest-press', 'band-row', 'band-lat-pulldown', 'lateral-band-walk'],
    active: true,
    createdAt: stamp,
    updatedAt: stamp
  }
]

export const workoutTemplate = workoutTemplates[0]
export const STRENGTH_START_DATE = program.startDate

const weeklyRuns = [
  [3, 5], [3, 6], [3, 7], [3, 5], [3.5, 8], [3.5, 9], [3, 6],
  [4, 10], [4, 8], [4, 11], [4, 8], [4, 12], [3, 8], [2, 13.1]
]

export function raceWeekNumberFor(date: string): number | null {
  const week = differenceInCalendarWeeks(mondayOf(date), fromISODate(program.startDate), { weekStartsOn: 1 }) + 1
  return week >= 1 && week <= weeklyRuns.length ? week : null
}

export function createRaceSessions(): PlanSession[] {
  const sessions: PlanSession[] = []
  weeklyRuns.forEach(([easy, long], index) => {
    const week = index + 1
    const monday = addCalendarDays(program.startDate, index * 7)
    const easyDate = addCalendarDays(monday, 1)
    sessions.push({
      id: `w${week}-easy`, programId: PROGRAM_ID, type: 'easy_run', originalDate: easyDate,
      scheduledDate: easyDate, title: 'Easy run', plannedDistanceMiles: easy, workoutTemplateId: null,
      required: true, status: 'upcoming', completedAt: null, actualDistanceMiles: null,
      notes: 'Easy, conversational effort. Walking breaks are welcome.'
    })
    const longDate = addCalendarDays(monday, week === 14 ? 6 : 5)
    sessions.push({
      id: `w${week}-${week === 14 ? 'race' : 'long'}`, programId: PROGRAM_ID,
      type: week === 14 ? 'race' : 'long_run', originalDate: longDate, scheduledDate: longDate,
      title: week === 14 ? 'Half marathon' : 'Long run', plannedDistanceMiles: long,
      workoutTemplateId: null, required: true, status: 'upcoming', completedAt: null,
      actualDistanceMiles: null, notes: week === 14 ? 'Race day · finish comfortably.' : 'Easy, conversational effort. Walking breaks are welcome.'
    })
  })
  return sessions
}

export function createStrengthSessions(startDate: string, endDate: string): PlanSession[] {
  if (endDate < STRENGTH_START_DATE) return []
  const requestedStart = toISODate(mondayOf(startDate))
  const firstMonday = requestedStart < STRENGTH_START_DATE ? STRENGTH_START_DATE : requestedStart
  const lastMonday = toISODate(mondayOf(endDate))
  const sessions: PlanSession[] = []
  for (let monday = firstMonday; monday <= lastMonday; monday = addCalendarDays(monday, 7)) {
    const raceWeek = raceWeekNumberFor(monday)
    const strengthDays = raceWeek === 14 ? [0] : [0, 3]
    strengthDays.forEach((offset, strengthIndex) => {
      const date = addCalendarDays(monday, offset)
      sessions.push({
        id: raceWeek ? `w${raceWeek}-strength-${strengthIndex + 1}` : `strength-${monday}-${strengthIndex + 1}`,
        programId: null,
        type: 'strength',
        originalDate: date,
        scheduledDate: date,
        title: raceWeek === 14 ? 'Light Full Body' : 'Full Body',
        plannedDistanceMiles: null,
        workoutTemplateId: TEMPLATE_ID,
        required: true,
        status: 'upcoming',
        completedAt: null,
        actualDistanceMiles: null,
        notes: raceWeek === 13 ? 'Taper: one fewer set per exercise; avoid grinding reps.' : raceWeek === 14 ? 'Race week: reduced volume at comfortable existing loads.' : null
      })
    })
  }
  return sessions
}

export function createSeedSessions(): PlanSession[] {
  return [...createRaceSessions(), ...createStrengthSessions(program.startDate, program.endDate)]
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.id.localeCompare(b.id))
}
