export type ISODate = string

export type PlanSessionType = 'easy_run' | 'long_run' | 'race' | 'strength' | 'rest'
export type PlanSessionStatus = 'upcoming' | 'waiting' | 'completed' | 'skipped'

export interface PlanProgram {
  id: string
  name: string
  startDate: ISODate
  endDate: ISODate
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface PlanSession {
  id: string
  programId: string
  type: PlanSessionType
  originalDate: ISODate
  scheduledDate: ISODate
  title: string
  plannedDistanceMiles: number | null
  workoutTemplateId: string | null
  required: boolean
  status: PlanSessionStatus
  completedAt: string | null
  actualDistanceMiles: number | null
  notes: string | null
}

export interface Exercise {
  id: string
  name: string
  movementPattern: string
  repMin: number
  repMax: number
  targetSets: number
  defaultIncrementLb: number
  substituteExerciseIds: string[]
  optional: boolean
}

export interface WorkoutTemplate {
  id: string
  name: string
  warmupSteps: string[]
  exerciseDefinitions: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkoutLog {
  id: string
  planSessionId: string | null
  templateId: string
  startedAt: string
  completedAt: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  notes: string | null
}

export interface SetLog {
  id: string
  workoutLogId: string
  plannedExerciseId: string
  performedExerciseId: string
  setNumber: number
  weightLb: number
  reps: number
  completedAt: string
}

export type MealType = 'breakfast' | 'work_lunch' | 'dinner' | 'other'
export type TrackedMealType = Exclude<MealType, 'other'>

export interface MealLog {
  id: string
  occurredAt: string
  mealDate: ISODate
  mealType: MealType
  type: 'home_prepared' | 'ate_out'
  dishId: string | null
  leftovers: boolean
  notes: string | null
}

export interface MealGoal {
  id: string
  mealType: TrackedMealType
  label: string
  targetPerWeek: number
  eligibleWeekdays: number[]
  effectiveFrom: ISODate
  effectiveUntil: ISODate | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface DishIngredient {
  displayName: string
  normalizedName: string
}

export interface Dish {
  id: string
  name: string
  ingredients: DishIngredient[]
  notes: string | null
  sourceUrl: string | null
  photoRef: string | null
  wouldMakeAgain: boolean | null
  createdAt: string
  updatedAt: string
}

export interface FreshItem {
  id: string
  name: string
  normalizedName: string
  addedAt: string
  attentionAt: string
  state: 'recent' | 'use_soon' | 'removed'
  removedAt: string | null
  notes: string | null
}

export interface Measurement {
  id: string
  type: 'weight' | 'waist'
  value: number
  unit: 'lb' | 'kg' | 'in' | 'cm'
  measuredAt: string
  notes: string | null
}

export interface AppSettings {
  id: 'app'
  weekStartsOn: 1
  distanceUnit: 'miles' | 'kilometers'
  weightUnit: 'pounds' | 'kilograms'
  homeMealWeeklyGoal: number
  freshItemAttentionDays: number
  calendarRemindersEnabled: boolean
  schemaVersion: number
  onboardingComplete: boolean
}

export interface BackupPayload {
  format: 'fitness-health-backup'
  schemaVersion: number
  exportedAt: string
  data: {
    planPrograms: PlanProgram[]
    planSessions: PlanSession[]
    workoutTemplates: WorkoutTemplate[]
    exercises: Exercise[]
    workoutLogs: WorkoutLog[]
    setLogs: SetLog[]
    mealLogs: MealLog[]
    mealGoals: MealGoal[]
    dishes: Dish[]
    freshItems: FreshItem[]
    measurements: Measurement[]
    settings: AppSettings[]
  }
}
