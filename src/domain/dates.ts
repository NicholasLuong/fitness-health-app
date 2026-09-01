import { addDays, endOfWeek, format, isAfter, isBefore, isSameDay, parseISO, startOfWeek } from 'date-fns'
import type { ISODate } from './types'

export const toISODate = (date: Date): ISODate => format(date, 'yyyy-MM-dd')
export const fromISODate = (date: ISODate): Date => parseISO(date)
export const mondayOf = (date: Date | ISODate): Date =>
  startOfWeek(typeof date === 'string' ? fromISODate(date) : date, { weekStartsOn: 1 })
export const sundayOf = (date: Date | ISODate): Date =>
  endOfWeek(typeof date === 'string' ? fromISODate(date) : date, { weekStartsOn: 1 })
export const addCalendarDays = (date: ISODate, days: number): ISODate => toISODate(addDays(fromISODate(date), days))
export const sameDay = (a: ISODate, b: ISODate): boolean => isSameDay(fromISODate(a), fromISODate(b))
export const beforeDay = (a: ISODate, b: ISODate): boolean => isBefore(fromISODate(a), fromISODate(b))
export const afterDay = (a: ISODate, b: ISODate): boolean => isAfter(fromISODate(a), fromISODate(b))
export const inSameWeek = (a: ISODate, b: ISODate): boolean => toISODate(mondayOf(a)) === toISODate(mondayOf(b))
export const formatDay = (date: ISODate, pattern = 'EEE, MMM d'): string => format(fromISODate(date), pattern)
