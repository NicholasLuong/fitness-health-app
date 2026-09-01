import { useState, type ReactNode } from 'react'
import { ToastContext } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const notify = (next: string) => {
    setMessage(next)
    window.setTimeout(() => setMessage((current) => current === next ? null : current), 2800)
  }
  return <ToastContext.Provider value={{ notify }}>{children}{message && <div className="toast" role="status">{message}</div>}</ToastContext.Provider>
}
