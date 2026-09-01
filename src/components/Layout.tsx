import { Activity, CalendarDays, CookingPot, Menu, Sprout, TrendingUp } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const nav = [
  { to: '/today', label: 'Today', icon: Activity },
  { to: '/plan', label: 'Plan', icon: CalendarDays },
  { to: '/kitchen', label: 'Kitchen', icon: CookingPot },
  { to: '/progress', label: 'Progress', icon: TrendingUp }
]

export function Layout() {
  const navigate = useNavigate()
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Sprout size={18} /></span>Steady</div>
      <button className="icon-button" aria-label="Open settings" onClick={() => navigate('/settings')}><Menu size={21} /></button>
    </header>
    <Outlet />
    <nav className="bottom-nav" aria-label="Main navigation">
      {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={21} /><span>{label}</span></NavLink>)}
    </nav>
  </div>
}
