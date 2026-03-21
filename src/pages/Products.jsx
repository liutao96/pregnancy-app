import { useState, useEffect } from 'react'
import { RefreshCw, ShoppingBag, Clock } from 'lucide-react'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { storage } from '../utils/storage'
import { generateProducts } from '../utils/ai'
import { getCurrentWeek } from '../utils/pregnancyCalc'

const URGENCY_CONFIG = {
  now: { label: '现在需要', color: 'bg-red-50 text-red-600 border-red-100' },
  soon: { label: '即将需要', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  later: { label: '之后准备', color: 'bg-slate-50 text-slate-500 border-slate-100' },
}

export default function Products() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(19)
  const [activeCategory, setActiveCategory] = useState(0)

  useEffect(() => {
    async function load() {
      const s = await storage.getSettings()
      const w = getCurrentWeek(s.dueDate)
      setCurrentWeek(w)
      await loadProducts(w)
    }
    load()
  }, [])

  async function loadProducts(week, forceRefresh = false) {
    setLoading(true)
    try {
      if (!forceRefresh) {
        const cached = await storage.getProductsCache(week)
        if (cached) {
          setData(cached)
          setLoading(false)
          return
        }
      }
      const result = await generateProducts(week)
      await storage.saveProductsCache(week, result)
      setData(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header
        title="好物推荐"
        right={
          <button
            onClick={() => loadProducts(currentWeek, true)}
            disabled={loading}
            className="p-2 text-slate-400 active:text-rose-500 disabled:opacity-40"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="px-4 py-3">
        <div className="bg-rose-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <ShoppingBag size={14} className="text-rose-500" />
          <p className="text-xs text-rose-600 font-medium">根据孕{currentWeek}周精选推荐 · 仅供参考</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="AI正在为你精选好物..." />
      ) : !data ? (
        <p className="text-center text-slate-400 py-10">暂无推荐</p>
      ) : (
        <>
          {/* Category tabs */}
          <div className="bg-white border-b border-rose-50 overflow-x-auto scrollbar-hide">
            <div className="flex px-2 min-w-max">
              {data.categories?.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => setActiveCategory(i)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeCategory === i
                      ? 'border-rose-500 text-rose-500'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="px-4 py-4">
            {data.categories?.[activeCategory] && (
              <div className="space-y-3">
                {data.categories[activeCategory].items?.map((item, i) => (
                  <ProductCard key={i} item={item} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ProductCard({ item }) {
  const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.later

  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-slate-800 flex-1">{item.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full border flex-shrink-0 font-medium ${urgency.color}`}>
          {urgency.label}
        </span>
      </div>

      <p className="text-sm text-slate-500 mb-3 leading-relaxed">{item.desc}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock size={12} />
          <p className="text-xs">{item.tips}</p>
        </div>
        {item.priceRange && (
          <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">
            {item.priceRange}
          </span>
        )}
      </div>
    </div>
  )
}
