import { NavLink } from 'react-router-dom'
import { Home, ClipboardList, BookOpen, MessageCircle, MoreHorizontal } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: '首页', exact: true },
  { to: '/checkups', icon: ClipboardList, label: '孕检' },
  { to: '/weekly', icon: BookOpen, label: '本周' },
  { to: '/qa', icon: MessageCircle, label: '问答' },
  { to: '/more', icon: MoreHorizontal, label: '更多' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-rose-100 safe-bottom"
      style={{ maxWidth: 480, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
      <div className="flex items-stretch h-[58px]">
        {tabs.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive
                  ? 'text-rose-500'
                  : 'text-slate-400 hover:text-rose-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-rose-50' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-rose-500' : 'text-slate-400'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
