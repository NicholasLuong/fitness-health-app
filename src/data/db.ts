import Dexie, { type EntityTable } from 'dexie'
import { defaultMealGoals, defaultSettings, exercises, program, workoutTemplate, createSeedSessions, SCHEMA_VERSION } from '../domain/seed'
import { inferredMealType, localMealDate } from '../domain/meals'
import type {
  AppSettings, Dish, FreshItem, MealGoal, MealLog, Measurement, PlanProgram, PlanSession,
  SetLog, WorkoutLog, WorkoutTemplate, Exercise
} from '../domain/types'

export class FitnessDatabase extends Dexie {
  planPrograms!: EntityTable<PlanProgram, 'id'>
  planSessions!: EntityTable<PlanSession, 'id'>
  workoutTemplates!: EntityTable<WorkoutTemplate, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workoutLogs!: EntityTable<WorkoutLog, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>
  mealLogs!: EntityTable<MealLog, 'id'>
  mealGoals!: EntityTable<MealGoal, 'id'>
  dishes!: EntityTable<Dish, 'id'>
  freshItems!: EntityTable<FreshItem, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor(name = 'fitness-health') {
    super(name)
    this.version(1).stores({
      planPrograms: 'id, status, startDate, endDate',
      planSessions: 'id, programId, scheduledDate, originalDate, type, status, [programId+scheduledDate]',
      workoutTemplates: 'id, active',
      exercises: 'id, movementPattern, optional',
      workoutLogs: 'id, planSessionId, templateId, startedAt, status',
      setLogs: 'id, workoutLogId, plannedExerciseId, performedExerciseId, [workoutLogId+setNumber]',
      mealLogs: 'id, occurredAt, type, dishId',
      dishes: 'id, name, updatedAt, wouldMakeAgain',
      freshItems: 'id, normalizedName, addedAt, attentionAt, state',
      measurements: 'id, type, measuredAt, [type+measuredAt]',
      settings: 'id, schemaVersion'
    })
    this.version(2).stores({
      mealLogs: 'id, occurredAt, mealDate, type, mealType, dishId',
      mealGoals: 'id, mealType, effectiveFrom, effectiveUntil, enabled, [mealType+effectiveFrom]'
    }).upgrade(async (transaction) => {
      await transaction.table('mealLogs').toCollection().modify((log: Partial<MealLog> & { occurredAt: string }) => {
        const occurred = new Date(log.occurredAt)
        log.mealDate = log.mealDate ?? localMealDate(occurred)
        log.mealType = log.mealType ?? inferredMealType(occurred)
      })
      await transaction.table('settings').toCollection().modify((settings: Partial<AppSettings>) => {
        settings.schemaVersion = SCHEMA_VERSION
      })
    })
  }
}

export const db = new FitnessDatabase()

export async function ensureSeeded(database: FitnessDatabase = db): Promise<void> {
  await database.transaction('rw', [database.planPrograms, database.planSessions, database.workoutTemplates, database.exercises, database.mealGoals, database.settings], async () => {
    if (!(await database.planPrograms.get(program.id))) await database.planPrograms.add(program)
    if ((await database.planSessions.where('programId').equals(program.id).count()) === 0) {
      await database.planSessions.bulkAdd(createSeedSessions())
    }
    if (!(await database.workoutTemplates.get(workoutTemplate.id))) await database.workoutTemplates.add(workoutTemplate)
    if ((await database.exercises.count()) === 0) await database.exercises.bulkAdd(exercises)
    if ((await database.mealGoals.count()) === 0) await database.mealGoals.bulkAdd(defaultMealGoals)
    if (!(await database.settings.get('app'))) await database.settings.add(defaultSettings)
    else await database.settings.update('app', { schemaVersion: SCHEMA_VERSION })
  })
}

export const dataTables = (database: FitnessDatabase) => [
  database.planPrograms, database.planSessions, database.workoutTemplates, database.exercises,
  database.workoutLogs, database.setLogs, database.mealLogs, database.mealGoals, database.dishes,
  database.freshItems, database.measurements, database.settings
]

export async function deleteAllData(database: FitnessDatabase = db): Promise<void> {
  await database.transaction('rw', dataTables(database), async () => {
    await Promise.all(dataTables(database).map((table) => table.clear()))
  })
}

export async function resetApp(database: FitnessDatabase = db): Promise<void> {
  await deleteAllData(database)
  await ensureSeeded(database)
}
