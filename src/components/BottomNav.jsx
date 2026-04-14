import { NavLink } from 'react-router-dom'
import { LayoutDashboard, HardHat, Clock, FileText, CalendarDays, ClipboardList } from 'lucide-react'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Übersicht' },
  { to: '/baustellen',   icon: HardHat,         label: 'Baustellen' },
  { to: '/zeiterfassung',icon: Clock,           label: 'Zeit' },
  { to: '/tagesberichte',icon: FileText,        label: 'Berichte' },
  { to: '/planung',      icon: CalendarDays,    label: 'Planung' },
  { to: '/aufgaben',     icon: ClipboardList,   label: 'Aufgaben' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
