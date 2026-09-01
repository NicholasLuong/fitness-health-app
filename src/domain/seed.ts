import { addCalendarDays } from './dates'
import type { AppSettings, Exercise, MealGoal, PlanProgram, PlanSession, WorkoutTemplate } from './types'

export const PROGRAM_ID = 'program-half-2026'
export const TEMPLATE_ID = 'template-full-body'
export const SCHEMA_VERSION = 2

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

export const exercises: Exercise[] = [
  ['leg-press', 'Leg press', 'squat', 8, 12, 3, 10, ['goblet-squat']],
  ['goblet-squat', 'Goblet squat to a bench', 'squat', 8, 12, 3, 5, ['leg-press']],
  ['db-rdl', 'Dumbbell Romanian deadlift', 'hinge', 8, 12, 3, 5, ['back-extension']],
  ['back-extension', '45-degree back extension', 'hinge', 8, 12, 3, 5, ['db-rdl']],
  ['db-bench', 'Dumbbell bench press', 'push', 8, 12, 3, 5, ['chest-press']],
  ['chest-press', 'Chest-press machine', 'push', 8, 12, 3, 5, ['db-bench']],
  ['cable-row', 'Seated cable row', 'pull', 8, 12, 3, 5, ['chest-supported-row']],
  ['chest-supported-row', 'Chest-supported dumbbell row', 'pull', 8, 12, 3, 5, ['cable-row']],
  ['lat-pulldown', 'Lat pulldown', 'vertical pull', 8, 12, 2, 5, ['assisted-pullup']],
  ['assisted-pullup', 'Assisted pull-up', 'vertical pull', 8, 12, 2, 5, ['lat-pulldown']],
  ['hip-abduction', 'Hip-abduction machine', 'abduction', 12, 20, 2, 5, ['lateral-band-walk']],
  ['lateral-band-walk', 'Lateral band walks', 'abduction', 12, 20, 2, 0, ['hip-abduction']]
].map(([id, name, movementPattern, repMin, repMax, targetSets, defaultIncrementLb, substituteExerciseIds]) => ({
  id: id as string,
  name: name as string,
  movementPattern: movementPattern as string,
  repMin: repMin as number,
  repMax: repMax as number,
  targetSets: targetSets as number,
  defaultIncrementLb: defaultIncrementLb as number,
  substituteExerciseIds: substituteExerciseIds as string[],
  optional: false
}))

export const workoutTemplate: WorkoutTemplate = {
  id: TEMPLATE_ID,
  name: 'Full Body',
  warmupSteps: [
    'Easy stationary bike — 2 minutes',
    'Bodyweight squat to a bench — 8 controlled reps',
    'Unweighted hip hinge — 8 reps',
    'Lateral band steps — 8 each direction',
    'Incline push-ups against a bench — 8 reps'
  ],
  exerciseDefinitions: ['leg-press', 'db-rdl', 'db-bench', 'cable-row', 'lat-pulldown', 'hip-abduction'],
  active: true,
  createdAt: stamp,
  updatedAt: stamp
}

const weeklyRuns = [
  [3, 5], [3, 6], [3, 7], [3, 5], [3.5, 8], [3.5, 9], [3, 6],
  [4, 10], [4, 8], [4, 11], [4, 8], [4, 12], [3, 8], [2, 13.1]
]

export function createSeedSessions(): PlanSession[] {
  const sessions: PlanSession[] = []
  weeklyRuns.forEach(([easy, long], index) => {
    const week = index + 1
    const monday = addCalendarDays(program.startDate, index * 7)
    const reduced = week === 13 || week === 14
    const strengthDays = week === 14 ? [0] : [0, 3]
    strengthDays.forEach((offset, strengthIndex) => {
      const date = addCalendarDays(monday, offset)
      sessions.push({
        id: `w${week}-strength-${strengthIndex + 1}`,
        programId: PROGRAM_ID,
        type: 'strength',
        originalDate: date,
        scheduledDate: date,
        title: week === 14 ? 'Light Full Body' : 'Full Body',
        plannedDistanceMiles: null,
        workoutTemplateId: TEMPLATE_ID,
        required: true,
        status: 'upcoming',
        completedAt: null,
        actualDistanceMiles: null,
        notes: reduced ? (week === 13 ? 'Taper: one fewer set per exercise; avoid grinding reps.' : 'Race week: reduced volume at comfortable existing loads.') : null
      })
    })
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
