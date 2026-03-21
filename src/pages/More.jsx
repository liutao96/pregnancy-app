import { useNavigate } from 'react-router-dom'
import { ShoppingBag, ClipboardCheck, Baby, Settings, ChevronRight, Utensils } from 'lucide-react'
import Header from '../components/Header'

const MENU_ITEMS = [
  {
    group: '工具',
    items: [
      { icon: Utensils, label: '本周食谱', desc: '每天3餐 · 3菜1汤', to: '/meal', color: 'bg-orange-50 text-orange-500' },
      { icon: ShoppingBag, label: '好物推荐', desc: '按孕周精选推荐商品', to: '/products', color: 'bg-amber-50 text-amber-500' },
      { icon: ClipboardCheck, label: '待产准备', desc: '待产包清单 · 进度追踪', to: '/preparation', color: 'bg-emerald-50 text-emerald-500' },
      { icon: Baby, label: '产后护理', desc: '喂奶记录 · 护理指南', to: '/postpartum', color: 'bg-sky-50 text-sky-500' },
    ]
  },
  {
    group: '设置',
    items: [
      { icon: Settings, label: '应用设置', desc: '预产期 · 饮食偏好', to: '/settings', color: 'bg-slate-50 text-slate-500' },
    ]
  }
]

export default function More() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="更多" />

      <div className="px-4 py-4 space-y-6">
        {MENU_ITEMS.map(group => (
          <div key={group.group}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 px-1">
              {group.group}
            </p>
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-rose-50">
              {group.items.map(item => (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-3 px-4 py-4 active:bg-rose-50"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-700 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="text-center py-4">
          <p className="text-xs text-slate-300">孕期陪伴 · 用爱守护每一周</p>
          <p className="text-xs text-slate-200 mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
