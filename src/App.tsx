import { lazy, Suspense, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { db, ensureSeeded } from './data/db'
import { Layout } from './components/Layout'
import { Button } from './components/ui'
import { ToastProvider } from './components/ToastProvider'
import { Activity } from 'lucide-react'

const Onboarding = lazy(() => import('./pages/Onboarding').then((module) => ({ default: module.Onboarding })))
const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })))
const PlanPage = lazy(() => import('./pages/PlanPage').then((module) => ({ default: module.PlanPage })))
const KitchenPage = lazy(() => import('./pages/KitchenPage').then((module) => ({ default: module.KitchenPage })))
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((module) => ({ default: module.ProgressPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const WorkoutPage = lazy(() => import('./pages/WorkoutPage').then((module) => ({ default: module.WorkoutPage })))

function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return <div className="update-banner" role="status"><span>A fresh version is ready.</span><div><Button className="button-small" onClick={() => updateServiceWorker(true)}>Update</Button><Button className="button-small" variant="ghost" onClick={() => setNeedRefresh(false)}>Later</Button></div></div>
}

function AppRoutes() {
  const location = useLocation()
  const settings = useLiveQuery(() => db.settings.get('app'))
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  if (!settings) return <div className="loading"><div className="loading-mark"><Activity /></div></div>
  if (!settings.onboardingComplete && location.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  if (settings.onboardingComplete && location.pathname === '/onboarding') return <Navigate to="/today" replace />
  return <Suspense fallback={<div className="loading"><div className="loading-mark"><Activity /></div></div>}>
    <UpdatePrompt />
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route path="/today" element={<TodayPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/workout/:sessionId" element={<WorkoutPage />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  </Suspense>
}

export function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { ensureSeeded().then(() => setReady(true)).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not open local storage.')) }, [])
  if (error) return <main className="page"><h1>Steady could not start</h1><p>{error}</p></main>
  if (!ready) return <div className="loading"><div className="loading-mark"><Activity /></div></div>
  return <ToastProvider><AppRoutes /></ToastProvider>
}
