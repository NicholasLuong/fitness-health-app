import { z } from 'zod'
import type { BackupPayload } from '../domain/types'
import { defaultMealGoals, SCHEMA_VERSION } from '../domain/seed'
import { normalizedMealLog } from '../domain/meals'
import { dataTables, ensureSeeded, type FitnessDatabase } from './db'

const nullableString = z.string().nullable()
const planProgramSchema = z.object({
  id: z.string(), name: z.string(), startDate: z.string(), endDate: z.string(),
  status: z.enum(['active', 'completed', 'archived']), createdAt: z.string(), updatedAt: z.string()
})
const planSessionSchema = z.object({
  id: z.string(), programId: nullableString, type: z.enum(['easy_run', 'long_run', 'race', 'strength', 'rest']),
  originalDate: z.string(), scheduledDate: z.string(), title: z.string(), plannedDistanceMiles: z.number().nullable(),
  workoutTemplateId: nullableString, required: z.boolean(), status: z.enum(['upcoming', 'waiting', 'completed', 'skipped']),
  completedAt: nullableString, actualDistanceMiles: z.number().nullable(), notes: nullableString
})
const templateSchema = z.object({
  id: z.string(), name: z.string(), description: z.string().default('Full-body strength session'),
  equipment: z.string().default('Gym equipment'), warmupSteps: z.array(z.string()), exerciseDefinitions: z.array(z.string()),
  active: z.boolean(), createdAt: z.string(), updatedAt: z.string()
})
const exerciseSchema = z.object({
  id: z.string(), name: z.string(), movementPattern: z.string(), loadUnit: z.enum(['lb', 'band_level']).default('lb'), repMin: z.number(), repMax: z.number(),
  targetSets: z.number(), defaultIncrementLb: z.number(), substituteExerciseIds: z.array(z.string()), optional: z.boolean()
})
const workoutLogSchema = z.object({
  id: z.string(), planSessionId: nullableString, templateId: z.string(), startedAt: z.string(), completedAt: nullableString,
  status: z.enum(['in_progress', 'completed', 'abandoned']), notes: nullableString
})
const setLogSchema = z.object({
  id: z.string(), workoutLogId: z.string(), plannedExerciseId: z.string(), performedExerciseId: z.string(),
  setNumber: z.number(), weightLb: z.number(), reps: z.number(), completedAt: z.string()
})
const mealLogSchema = z.object({
  id: z.string(), occurredAt: z.string(), type: z.enum(['home_prepared', 'ate_out']), dishId: nullableString,
  leftovers: z.boolean(), notes: nullableString, mealDate: z.string().optional(),
  mealType: z.enum(['breakfast', 'work_lunch', 'dinner', 'other']).optional()
}).transform((log) => normalizedMealLog(log))
const mealGoalSchema = z.object({
  id: z.string(), mealType: z.enum(['breakfast', 'work_lunch', 'dinner']), label: z.string(),
  targetPerWeek: z.number().int().min(0).max(7), eligibleWeekdays: z.array(z.number().int().min(1).max(7)),
  effectiveFrom: z.string(), effectiveUntil: nullableString, enabled: z.boolean(), createdAt: z.string(), updatedAt: z.string()
})
const dishSchema = z.object({
  id: z.string(), name: z.string(), ingredients: z.array(z.object({ displayName: z.string(), normalizedName: z.string() })),
  notes: nullableString, sourceUrl: nullableString, photoRef: nullableString, wouldMakeAgain: z.boolean().nullable(),
  createdAt: z.string(), updatedAt: z.string()
})
const freshItemSchema = z.object({
  id: z.string(), name: z.string(), normalizedName: z.string(), addedAt: z.string(), attentionAt: z.string(),
  state: z.enum(['recent', 'use_soon', 'removed']), removedAt: nullableString, notes: nullableString
})
const measurementSchema = z.object({
  id: z.string(), type: z.enum(['weight', 'waist']), value: z.number(), unit: z.enum(['lb', 'kg', 'in', 'cm']),
  measuredAt: z.string(), notes: nullableString
})
const settingsSchema = z.object({
  id: z.literal('app'), weekStartsOn: z.literal(1), distanceUnit: z.enum(['miles', 'kilometers']),
  weightUnit: z.enum(['pounds', 'kilograms']), homeMealWeeklyGoal: z.number().int().positive(),
  freshItemAttentionDays: z.number().int().positive(), calendarRemindersEnabled: z.boolean(),
  schemaVersion: z.number().int(), onboardingComplete: z.boolean()
})

export const backupSchema = z.object({
  format: z.literal('fitness-health-backup'),
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  data: z.object({
    planPrograms: z.array(planProgramSchema), planSessions: z.array(planSessionSchema),
    workoutTemplates: z.array(templateSchema), exercises: z.array(exerciseSchema),
    workoutLogs: z.array(workoutLogSchema), setLogs: z.array(setLogSchema), mealLogs: z.array(mealLogSchema), mealGoals: z.array(mealGoalSchema).default([]),
    dishes: z.array(dishSchema), freshItems: z.array(freshItemSchema), measurements: z.array(measurementSchema),
    settings: z.array(settingsSchema)
  })
})

export async function createBackup(database: FitnessDatabase): Promise<BackupPayload> {
  return {
    format: 'fitness-health-backup',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      planPrograms: await database.planPrograms.toArray(), planSessions: await database.planSessions.toArray(),
      workoutTemplates: await database.workoutTemplates.toArray(), exercises: await database.exercises.toArray(),
      workoutLogs: await database.workoutLogs.toArray(), setLogs: await database.setLogs.toArray(),
      mealLogs: await database.mealLogs.toArray(), mealGoals: await database.mealGoals.toArray(), dishes: await database.dishes.toArray(),
      freshItems: await database.freshItems.toArray(), measurements: await database.measurements.toArray(),
      settings: await database.settings.toArray()
    }
  }
}

export function validateBackup(input: unknown): BackupPayload {
  const backup = backupSchema.parse(input)
  if (backup.schemaVersion > SCHEMA_VERSION) throw new Error('This backup was created by a newer version of Steady.')
  if (backup.schemaVersion < 1) throw new Error('This backup version is not supported.')
  return {
    ...backup,
    schemaVersion: SCHEMA_VERSION,
    data: {
      ...backup.data,
      mealGoals: backup.data.mealGoals.length ? backup.data.mealGoals : defaultMealGoals.map((goal) => ({ ...goal })),
      settings: backup.data.settings.map((settings) => ({ ...settings, schemaVersion: SCHEMA_VERSION }))
    }
  } as BackupPayload
}

export async function restoreBackup(database: FitnessDatabase, backup: BackupPayload): Promise<void> {
  const valid = validateBackup(backup)
  await database.transaction('rw', dataTables(database), async () => {
    await Promise.all(dataTables(database).map((table) => table.clear()))
    await database.planPrograms.bulkAdd(valid.data.planPrograms)
    await database.planSessions.bulkAdd(valid.data.planSessions)
    await database.workoutTemplates.bulkAdd(valid.data.workoutTemplates)
    await database.exercises.bulkAdd(valid.data.exercises)
    await database.workoutLogs.bulkAdd(valid.data.workoutLogs)
    await database.setLogs.bulkAdd(valid.data.setLogs)
    await database.mealLogs.bulkAdd(valid.data.mealLogs)
    await database.mealGoals.bulkAdd(valid.data.mealGoals)
    await database.dishes.bulkAdd(valid.data.dishes)
    await database.freshItems.bulkAdd(valid.data.freshItems)
    await database.measurements.bulkAdd(valid.data.measurements)
    await database.settings.bulkAdd(valid.data.settings)
  })
  await ensureSeeded(database)
}

export function backupCounts(backup: BackupPayload): string {
  const data = backup.data
  return `${data.planSessions.length} plan sessions, ${data.workoutLogs.length} workouts, ${data.mealLogs.length} meals, ${data.mealGoals.length} meal commitments, ${data.dishes.length} dishes, ${data.freshItems.length} fresh items, and ${data.measurements.length} measurements`
}
