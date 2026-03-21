import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Baby, Apple, AlertCircle, Heart } from 'lucide-react'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { storage } from '../utils/storage'
import { generateWeeklyGuide } from '../utils/ai'
import { getCurrentWeek, getBabySize, checkupMilestones } from '../utils/pregnancyCalc'

export default function WeeklyGuide() {
  const [settings, setSettings] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(19)
  const [selectedWeek, setSelectedWeek] = useState(19)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('baby')

  useEffect(() => {
    storage.getSettings().then(s => {
      setSettings(s)
      const w = getCurrentWeek(s.dueDate, new Date(), s)
      setCurrentWeek(w)
      setSelectedWeek(w)
    })
  }, [])

  useEffect(() => {
    if (!settings || !selectedWeek) return
    loadContent(selectedWeek)
  }, [selectedWeek, settings])

  async function loadContent(week, forceRefresh = false) {
    setLoading(true)
    try {
      if (!forceRefresh) {
        const cached = await storage.getWeekCache(week)
        if (cached) {
          setContent(cached)
          setLoading(false)
          return
        }
      }
      const data = await generateWeeklyGuide(week, settings.dueDate, settings)
      await storage.saveWeekCache(week, data)
      setContent(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const babySize = getBabySize(selectedWeek)
  const milestone = checkupMilestones.find(m => m.week === selectedWeek)

  const tabs = [
    { id: 'baby', icon: Baby, label: '宝宝发育' },
    { id: 'nutrition', icon: Apple, label: '饮食营养' },
    { id: 'precautions', icon: AlertCircle, label: '注意事项' },
    { id: 'dad', icon: Heart, label: '爸爸指南' },
  ]

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="本周指南" />

      {/* Week selector */}
      <div className="bg-white border-b border-rose-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedWeek(w => Math.max(4, w - 1))}
            disabled={selectedWeek <= 4}
            className="p-2 rounded-xl bg-rose-50 text-rose-400 disabled:opacity-30 active:bg-rose-100"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <p className="text-2xl font-bold text-rose-500">第 {selectedWeek} 周</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedWeek === currentWeek ? '本周' : selectedWeek < currentWeek ? `${currentWeek - selectedWeek}周前` : `第${selectedWeek}周`}
            </p>
          </div>

          <button
            onClick={() => setSelectedWeek(w => Math.min(42, w + 1))}
            disabled={selectedWeek >= 42}
            className="p-2 rounded-xl bg-rose-50 text-rose-400 disabled:opacity-30 active:bg-rose-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Baby size */}
        <div className="flex items-center justify-center gap-3 mt-3 py-2 bg-rose-50 rounded-2xl">
          <span className="text-2xl">{babySize.emoji}</span>
          <div>
            <span className="text-sm font-semibold text-slate-700">宝宝大小：{babySize.name}</span>
            <span className="text-xs text-slate-500 ml-1">{babySize.size}</span>
          </div>
          {selectedWeek === currentWeek && (
            <button
              onClick={() => loadContent(selectedWeek, true)}
              className="ml-auto p-1.5 text-slate-400 active:text-rose-500"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>

        {/* Checkup milestone */}
        {milestone && (
          <div className="mt-2 flex items-center gap-2 py-2 px-3 bg-amber-50 rounded-xl">
            <span className="text-amber-500 text-sm">🔔</span>
            <div>
              <p className="text-xs font-semibold text-amber-700">{milestone.name}</p>
              <p className="text-xs text-amber-600">{milestone.desc}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-rose-50">
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-rose-500 text-rose-500'
                  : 'border-transparent text-slate-400'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSpinner text="AI正在生成本周指南..." />
        ) : !content ? (
          <p className="text-center text-slate-400 py-10">暂无内容</p>
        ) : (
          <>
            {activeTab === 'baby' && <BabyTab data={content.babyDevelopment} momData={content.momChanges} tip={content.weeklyTip} />}
            {activeTab === 'nutrition' && <NutritionTab data={content.nutrition} />}
            {activeTab === 'precautions' && <PrecautionsTab data={content.precautions} />}
            {activeTab === 'dad' && <DadTab data={content.dadGuide} />}
          </>
        )}
      </div>
    </div>
  )
}

function BabyTab({ data, momData, tip }) {
  return (
    <div className="space-y-4">
      {tip && (
        <div className="bg-gradient-to-r from-rose-400 to-pink-400 rounded-2xl p-4 text-white">
          <p className="text-xs font-medium opacity-80 mb-1">本周贴心话</p>
          <p className="text-sm font-medium leading-relaxed">{tip}</p>
        </div>
      )}
      <InfoCard title="宝宝发育" headline={data?.headline} items={data?.details} color="bg-rose-50" />
      <InfoCard title="妈妈变化" headline={momData?.headline} items={momData?.details} color="bg-violet-50" />
    </div>
  )
}

function NutritionTab({ data }) {
  if (!data) return null
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4">
        <p className="font-semibold text-slate-800 mb-3">{data.headline}</p>
        {data.keyNutrients?.map((n, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 bg-rose-400 rounded-full flex-shrink-0" />
              <p className="font-semibold text-slate-700 text-sm">{n.name}</p>
            </div>
            <p className="text-xs text-slate-500 mb-1.5 ml-4">{n.why}</p>
            <div className="flex flex-wrap gap-1.5 ml-4">
              {n.foods?.map((f, j) => (
                <span key={j} className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full">{f}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {data.recipes?.length > 0 && (
        <div className="bg-white rounded-2xl p-4">
          <p className="font-semibold text-slate-800 mb-3">推荐食谱</p>
          <div className="space-y-3">
            {data.recipes.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl">
                <span className="text-lg flex-shrink-0">🍽️</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{r.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.avoid?.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="font-semibold text-amber-700 mb-2">本周需要避免</p>
          <div className="space-y-1.5">
            {data.avoid.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 text-sm flex-shrink-0">✗</span>
                <p className="text-sm text-amber-700">{a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PrecautionsTab({ data }) {
  if (!data?.length) return <p className="text-center text-slate-400 py-10">暂无内容</p>
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="bg-white rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DadTab({ data }) {
  if (!data) return null
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-400 to-purple-400 rounded-2xl p-4 text-white">
        <p className="text-xs font-medium opacity-80 mb-1">准爸爸专属</p>
        <p className="font-semibold">{data.headline}</p>
      </div>
      <div className="bg-white rounded-2xl p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">本周可以做的事</p>
        <div className="space-y-3">
          {data.tasks?.map((t, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl">
              <span className="text-violet-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
              <p className="text-sm text-violet-700">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, headline, items, color }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <p className="text-xs font-medium text-slate-400 mb-2">{title}</p>
      {headline && <p className="font-semibold text-slate-800 mb-3">{headline}</p>}
      <div className={`${color} rounded-xl p-3 space-y-2`}>
        {items?.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full flex-shrink-0 mt-1.5" />
            <p className="text-sm text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
