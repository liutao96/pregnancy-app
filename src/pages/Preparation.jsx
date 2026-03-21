import { useState, useEffect } from 'react'
import { CheckSquare, Square } from 'lucide-react'
import Header from '../components/Header'
import { storage } from '../utils/storage'

const CATEGORY_ICONS = {
  '证件材料': '📄',
  '妈妈用品': '👩',
  '宝宝用品': '👶',
  '入院必备': '🏥',
}

export default function Preparation() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    storage.getPreparation().then(setItems)
  }, [])

  async function toggle(id) {
    const updated = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    )
    setItems(updated)
    await storage.savePreparation(updated)
  }

  // Group by category
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const categories = Object.keys(grouped)
  const checkedCount = items.filter(i => i.checked).length
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0

  const displayItems = filter === 'all'
    ? items
    : filter === 'done'
    ? items.filter(i => i.checked)
    : items.filter(i => !i.checked)

  const displayGrouped = displayItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="待产准备" />

      {/* Progress */}
      <div className="bg-gradient-to-r from-rose-400 to-pink-400 px-5 py-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium opacity-90">待产包准备进度</p>
            <p className="text-2xl font-bold mt-0.5">{checkedCount} / {items.length}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{progress}%</p>
            <p className="text-xs opacity-70 mt-0.5">已完成</p>
          </div>
        </div>
        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white border-b border-rose-50 flex">
        {[
          { id: 'all', label: '全部' },
          { id: 'todo', label: '未完成' },
          { id: 'done', label: '已完成' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              filter === f.id ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Checklist */}
      <div className="px-4 py-4 space-y-5">
        {Object.keys(displayGrouped).map(category => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{CATEGORY_ICONS[category] || '📦'}</span>
              <p className="font-semibold text-slate-700">{category}</p>
              <span className="text-xs text-slate-400 ml-auto">
                {displayGrouped[category].filter(i => i.checked).length}/{displayGrouped[category].length}
              </span>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden divide-y divide-rose-50">
              {displayGrouped[category].map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-rose-50 transition-colors text-left"
                >
                  {item.checked ? (
                    <CheckSquare size={20} className="text-rose-500 flex-shrink-0" />
                  ) : (
                    <Square size={20} className="text-slate-300 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {progress === 100 && (
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-emerald-700">太棒了！所有物品都准备好了</p>
            <p className="text-sm text-emerald-600 mt-1">随时迎接宝宝的到来！</p>
          </div>
        )}
      </div>
    </div>
  )
}
