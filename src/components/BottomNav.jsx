import { NavLink } from 'react-router-dom'
import { LayoutDashboard, HardHat, Clock, FileText, CalendarDays, ClipboardList, BarChart2, Wrench, UserCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navArbeiter = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Start' },
  { to: '/zeiterfassung',icon: Clock,           label: 'Zeit' },
  { to: '/tagesberichte',icon: FileText,        label: 'Berichte' },
  { to: '/aufgaben',     icon: ClipboardList,   label: 'Aufgaben' },
  { to: '/profil',       icon: UserCircle,      label: 'Profil' },
]

const navChef = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Start' },
  { to: '/baustellen',   icon: HardHat,         label: 'Baustellen' },
  { to: '/planung',      icon: CalendarDays,    label: 'Planung' },
  { to: '/zeiterfassung',icon: Clock,           label: 'Zeit' },
  { to: '/tagesberichte',icon: FileText,        label: 'Berichte' },
  { to: '/aufgaben',     icon: ClipboardList,   label: 'Aufgaben' },
  { to: '/geraete',      icon: Wrench,          label: 'Geräte' },
  { to: '/auswertung',   icon: BarChart2,       label: 'Stats' },
  { to: '/profil',       icon: UserCircle,      label: 'Profil' },
]

export default function BottomNav() {
  const { profile } = useAuth()
  const isChef = ['chef', 'bauleiter', 'polier'].includes(profile?.rolle)
  const items = isChef ? navChef : navArbeiter

  return (
    <div className={`bottom-nav-wrapper${isChef ? ' scrollable' : ''}`}>
      <nav className="bottom-nav">
        {items.map(({ to, icon: Icon, label }) => (
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
    </div>
  )
}
