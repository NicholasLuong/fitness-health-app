import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ArrowLeft, Database, Download, HardDrive, Info, Lock, RotateCcw, Smartphone, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/toast-context'
import { backupCounts, createBackup, restoreBackup, validateBackup } from '../data/backup'
import { db, resetApp } from '../data/db'
import { localMealDate, mealGoalsForWeek } from '../domain/meals'
import type { BackupPayload } from '../domain/types'
import { MealGoalsModal } from '../components/ActionModals'
import { Button, Card, Chip, Field, Modal, SectionHeader } from '../components/ui'

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const mealGoals = useLiveQuery(() => db.mealGoals.toArray(), []) ?? []
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { notify } = useToast()
  if (!settings) return null
  const currentMealGoals = mealGoalsForWeek(mealGoals, localMealDate(new Date()))

  const update = async <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    await db.settings.update('app', { [key]: value })
    notify('Preference saved.')
  }
  const exportData = async () => {
    const backup = await createBackup(db)
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `steady-backup-${backup.exportedAt.slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    notify('Backup exported.')
  }
  const chooseRestore = async (file?: File) => {
    if (!file) return
    setRestoreError(null)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      setPendingBackup(validateBackup(parsed))
    } catch (cause) {
      setRestoreError(cause instanceof Error ? cause.message : 'This is not a valid Steady backup.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }
  const confirmRestore = async () => {
    if (!pendingBackup) return
    await restoreBackup(db, pendingBackup)
    setPendingBackup(null)
    notify('Backup restored.')
    navigate('/today')
  }
  const clearData = async () => {
    if (!window.confirm('Delete your logs, dishes, groceries, measurements, and changes? The approved base plan will be reseeded. Export a backup first if you may want this data later.')) return
    await resetApp(db)
    notify('Local data deleted and the base plan reset.')
    navigate('/onboarding')
  }

  return <main className="page">
    <button className="link-button" onClick={() => navigate(-1)} style={{ marginBottom: 18 }}><ArrowLeft size={15} style={{ display: 'inline', marginRight: 5 }} />Back</button>
    <p className="eyebrow">On-device controls</p>
    <h1 className="page-title">Settings</h1>
    <p className="page-intro">Your plan and records stay in this browser unless you explicitly export them.</p>

    <SectionHeader eyebrow="Preferences" title="Make it yours" />
    <Card style={{ boxShadow: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}><div><strong>Meal commitments</strong><p className="subtle">Home-prepared includes assembled meals, packed lunches, and leftovers.</p><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{currentMealGoals.map((goal) => <Chip key={goal.id} tone="green">{goal.label} {goal.targetPerWeek}</Chip>)}</div></div><Button className="button-small" variant="secondary" onClick={() => setGoalsOpen(true)}>Adjust</Button></div>
      <div className="divider" />
      <Field label="Fresh List attention interval" hint="“Use soon” is a planning nudge, not an expiration estimate."><select className="input" value={settings.freshItemAttentionDays} onChange={(event) => update('freshItemAttentionDays', Number(event.target.value))}><option value="3">3 days</option><option value="5">5 days</option><option value="7">7 days</option><option value="10">10 days</option><option value="14">14 days</option></select></Field>
      <div className="form-grid"><Field label="Distance"><select className="input" value={settings.distanceUnit} onChange={(event) => update('distanceUnit', event.target.value as typeof settings.distanceUnit)}><option value="miles">Miles</option><option value="kilometers">Kilometers</option></select></Field><Field label="Weight"><select className="input" value={settings.weightUnit} onChange={(event) => update('weightUnit', event.target.value as typeof settings.weightUnit)}><option value="pounds">Pounds</option><option value="kilograms">Kilograms</option></select></Field></div>
      <p className="subtle" style={{ marginBottom: 0 }}>Weeks run Monday–Sunday to match the approved training program. The seeded plan remains recorded in miles.</p>
    </Card>

    <SectionHeader eyebrow="Backup & restore" title="Keep a portable copy" />
    <Card><div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}><HardDrive color="#1f5c4a" /><div><strong>Local-first means you own the backup</strong><p className="subtle">Clearing browser or site data can erase Steady. Export periodically and keep the JSON file somewhere safe.</p></div></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}><Button onClick={exportData}><Download size={16} style={{ display: 'inline', marginRight: 6 }} />Export backup</Button><Button variant="secondary" onClick={() => inputRef.current?.click()}><Upload size={16} style={{ display: 'inline', marginRight: 6 }} />Restore backup</Button><input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={(event) => chooseRestore(event.target.files?.[0])} /></div>{restoreError && <div className="notice" style={{ marginTop: 14 }}><AlertTriangle size={15} style={{ display: 'inline', marginRight: 5 }} />{restoreError}. Your current data was not changed.</div>}</Card>

    <SectionHeader eyebrow="Install" title="Put Steady on your home screen" />
    <Card style={{ boxShadow: 'none' }}><div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}><Smartphone color="#ed765d" /><div><strong>On iPhone</strong><p className="subtle">Open this site in Safari, tap Share, then choose “Add to Home Screen.” After the first successful load, the core app works offline.</p><strong>On desktop or Android</strong><p className="subtle" style={{ marginBottom: 0 }}>Use your browser’s Install option in the address bar or menu.</p></div></div></Card>

    <SectionHeader eyebrow="Safety & privacy" title="Honest boundaries" />
    <Card style={{ boxShadow: 'none' }}><div className="list" style={{ gap: 16 }}><div style={{ display: 'flex', gap: 12 }}><Lock size={19} /><p className="subtle" style={{ margin: 0 }}>No account, analytics, server, or API key. Data remains in IndexedDB on this device until you export it.</p></div><div style={{ display: 'flex', gap: 12 }}><Info size={19} /><p className="subtle" style={{ margin: 0 }}>This plan is general fitness guidance, not medical advice. Do not push through sharp, worsening, swelling-related, or stride-changing pain. Seek professional evaluation when appropriate.</p></div></div></Card>

    <SectionHeader eyebrow="Reset" title="Start from the approved plan" />
    <Card style={{ borderColor: '#edc2b7', boxShadow: 'none' }}><p className="subtle">This deletes all local records and plan edits, then restores the exact September 7–December 13 plan. This cannot be undone without a backup.</p><Button variant="danger" onClick={clearData}><RotateCcw size={16} style={{ display: 'inline', marginRight: 6 }} />Delete data & reset</Button></Card>

    <p className="subtle" style={{ textAlign: 'center', marginTop: 28 }}>Steady schema {settings.schemaVersion} · No telemetry</p>
    {pendingBackup && <Modal title="Restore this backup?" onClose={() => setPendingBackup(null)}><div className="notice"><Database size={16} style={{ display: 'inline', marginRight: 5 }} />Validated Steady backup from {new Date(pendingBackup.exportedAt).toLocaleString()}.</div><p className="subtle" style={{ marginTop: 15 }}>It contains {backupCounts(pendingBackup)}. Restoring replaces all current local data only after you confirm.</p><div className="modal-actions"><Button variant="ghost" onClick={() => setPendingBackup(null)}>Cancel</Button><Button onClick={confirmRestore}>Replace & restore</Button></div></Modal>}
    {goalsOpen && <MealGoalsModal goals={mealGoals} onClose={() => setGoalsOpen(false)} />}
  </main>
}
