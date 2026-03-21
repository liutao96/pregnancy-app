import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Check, X, ChevronDown, ChevronUp, ChefHat, BookOpen, Loader } from 'lucide-react'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { storage } from '../utils/storage'
import { generateMealPlan, generateRecipe } from '../utils/ai'
import { getCurrentWeek } from '../utils/pregnancyCalc'

const MEAL_TYPES = [
  { key: 'breakfast', label: '早餐', emoji: '🌅' },
  { key: 'lunch', label: '午餐', emoji: '☀️' },
  { key: 'dinner', label: '晚餐', emoji: '🌙' },
]

// Get tomorrow's date as a string key
function getTomorrowKey() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd')
}

function getDayName(date) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[date.getDay()]
}

export default function MealPlan() {
  const [settings, setSettings] = useState(null)
  const [currentWeek, setCurrentWeek] = useState(19)
  const [planData, setPlanData] = useState(null)      // the full week plan
  const [tomorrowMeals, setTomorrowMeals] = useState(null)  // tomorrow's meals
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [tomorrowConfirmed, setTomorrowConfirmed] = useState(false)
  const [tomorrowConfirmedDate, setTomorrowConfirmedDate] = useState(null) // '2026-03-22'
  const [expandedDay, setExpandedDay] = useState(null)
  const [showFullWeek, setShowFullWeek] = useState(false)
  const [recipeModal, setRecipeModal] = useState(null)
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [exclusions, setExclusions] = useState({ dislikes: [], taboo: [] })

  const tomorrow = addDays(new Date(), 1)
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const [s, h, ex] = await Promise.all([
        storage.getSettings(),
        storage.getMealHistory(),
        storage.getFoodExclusions(),
      ])
      setSettings(s)
      setHistory(h)
      setExclusions(ex)
      const w = getCurrentWeek(s.dueDate, new Date(), s)
      setCurrentWeek(w)

      // Find existing confirmed plan for tomorrow
      const existing = h.find(item => item.tomorrowDate === tomorrowStr && item.confirmed)
      if (existing) {
        // We have a confirmed plan for tomorrow - show immediately
        setPlanData(existing.plan)
        setTomorrowMeals(findDayInPlan(existing.plan, tomorrow))
        setTomorrowConfirmed(true)
        setTomorrowConfirmedDate(existing.tomorrowDate)
        setExpandedDay(getDayName(tomorrow))
      } else {
        // No confirmed plan for tomorrow - need to generate
        // First check if we have a plan from history that we can use
        const existingPlan = h[0]
        if (existingPlan && existingPlan.plan) {
          setPlanData(existingPlan.plan)
          setTomorrowMeals(findDayInPlan(existingPlan.plan, tomorrow))
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  function findDayInPlan(plan, date) {
    if (!plan?.days) return null
    const dayName = getDayName(date)
    return plan.days.find(d => d.day === dayName)
  }

  const generatePlan = useCallback(async (forceNew = false) => {
    setGenerating(true)
    try {
      const pastDishes = history.flatMap(h =>
        h.plan?.days?.flatMap(d =>
          [d.breakfast, d.lunch, d.dinner].flatMap(m => [...(m?.dishes || []), m?.soup].filter(Boolean))
        ) || []
      )
      const plan = await generateMealPlan(currentWeek, exclusions, pastDishes)
      setPlanData(plan)
      const tomorrowData = findDayInPlan(plan, tomorrow)
      setTomorrowMeals(tomorrowData)
      if (!tomorrowConfirmed) {
        // If not yet confirmed, show tomorrow's meals
        setExpandedDay(getDayName(tomorrow))
      }
    } catch (e) {
      console.error(e)
      alert('生成失败：' + e.message)
    } finally {
      setGenerating(false)
    }
  }, [currentWeek, exclusions, history, tomorrow, tomorrowConfirmed])

  async function confirmTomorrow() {
    // Save confirmed plan
    const entry = {
      tomorrowDate: tomorrowStr,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      plan: planData,
    }
    const newHistory = await storage.addMealWeek(entry)
    setHistory(newHistory)
    setTomorrowConfirmed(true)
    setTomorrowConfirmedDate(tomorrowStr)
  }

  function handleRegenerate() {
    generatePlan(true)
    setTomorrowConfirmed(false)
  }

  function handleRecipe(dishName) {
    setRecipeModal({ name: dishName, loading: true })
    setRecipeLoading(true)
    generateRecipe(dishName, '').then(recipe => {
      setRecipeModal(recipe)
      setRecipeLoading(false)
    }).catch(e => {
      setRecipeLoading(false)
      setRecipeModal({ name: dishName, error: e.message })
    })
  }

  if (loading) {
    return <div className="min-h-screen bg-rose-50"><LoadingSpinner text="加载中..." /></div>
  }

  // If we don't have a plan yet, show generating state
  if (!planData && generating) {
    return <div className="min-h-screen bg-rose-50"><LoadingSpinner text="AI正在为你生成食谱..." /></div>
  }

  const confirmedLabel = tomorrowConfirmed
    ? `已确认为明天 ${tomorrowConfirmedDate === tomorrowStr ? '的食谱' : ''}`
    : '待确认'

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header
        title="明日食谱"
        right={
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-1 text-rose-500 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
            <span>{generating ? '生成中' : '重新生成'}</span>
          </button>
        }
      />

      {/* Tomorrow hero card */}
      <div className="bg-gradient-to-br from-orange-400 to-rose-400 text-white px-4 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-white/70">明天 · {format(tomorrow, 'M月d日')} · {getDayName(tomorrow)}</p>
            <p className="text-lg font-bold mt-0.5">明日食谱</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            tomorrowConfirmed ? 'bg-white/30 text-white' : 'bg-white/20 text-white/80'
          }`}>
            {tomorrowConfirmed ? '✓ 已确认' : '待确认'}
          </div>
        </div>

        {/* Tomorrow's meals - always visible */}
        {tomorrowMeals ? (
          <div className="space-y-3">
            {MEAL_TYPES.map(meal => {
              const mealData = tomorrowMeals[meal.key]
              if (!mealData) return null
              return (
                <div key={meal.key}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm opacity-80">{meal.emoji}</span>
                    <span className="text-xs font-medium text-white/70">{meal.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mealData.dishes.map((dish, i) => (
                      <DishChip key={i} name={dish} onRecipe={handleRecipe} />
                    ))}
                    {mealData.soup && (
                      <span className="bg-white/20 text-white/90 text-xs px-2.5 py-1 rounded-full">
                        🥣 {mealData.soup}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-white/70 text-sm">点击上方"重新生成"获取明日食谱</p>
          </div>
        )}
      </div>

      {/* Confirm button for tomorrow */}
      {!tomorrowConfirmed && tomorrowMeals && (
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <button
              onClick={confirmTomorrow}
              className="w-full bg-rose-500 text-white py-3.5 rounded-2xl font-semibold text-base active:bg-rose-600 flex items-center justify-center gap-2"
            >
              <Check size={18} />
              确认明天食谱
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              确认后会缓存，明天打开直接显示，不需要等待AI生成
            </p>
          </div>
        </div>
      )}

      {/* Confirmed badge */}
      {tomorrowConfirmed && (
        <div className="px-4 -mt-4 mb-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2">
            <Check size={16} className="text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700">
              已确认为明天的食谱，明天打开直接看，无需等待
            </p>
          </div>
        </div>
      )}

      {/* Week overview toggle */}
      <div className="px-4 mt-2 mb-3">
        <button
          onClick={() => setShowFullWeek(!showFullWeek)}
          className="w-full flex items-center justify-between py-2 text-sm text-slate-500"
        >
          <span>查看整周食谱</span>
          {showFullWeek ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Full week view */}
      {showFullWeek && planData && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-slate-400">{planData.weekLabel}</p>
          {planData.days.map(day => (
            <DayCard
              key={day.day}
              day={day}
              isExpanded={expandedDay === day.day}
              onToggle={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
              onRecipe={handleRecipe}
              isToday={getDayName(tomorrow) === day.day}
            />
          ))}
        </div>
      )}

      {/* Recipe Modal */}
      {recipeModal && (
        <RecipeModal
          recipe={recipeModal}
          loading={recipeLoading}
          onClose={() => setRecipeModal(null)}
        />
      )}
    </div>
  )
}

function DishChip({ name, onRecipe }) {
  return (
    <button
      onClick={() => onRecipe(name)}
      className="bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
    >
      <ChefHat size={10} />
      {name}
    </button>
  )
}

function DayCard({ day, isExpanded, onToggle, onRecipe, isToday }) {
  const dayColor = day.type === 'sunday' ? 'border-l-rose-400'
    : day.type === 'weekend' ? 'border-l-violet-400'
    : 'border-l-violet-300'

  return (
    <div className={`bg-white rounded-2xl overflow-hidden border-l-4 ${dayColor} ${isToday ? 'ring-2 ring-orange-200' : ''}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 active:bg-rose-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${isToday ? 'text-orange-500' : 'text-slate-800'}`}>
            {day.day}
            {isToday && <span className="ml-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">明天</span>}
          </span>
          <span className="text-xs text-slate-400">
            {day.type === 'sunday' ? '周日·营养加倍' : day.type === 'weekend' ? '周六' : '工作日'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-rose-50 px-4 py-3 space-y-4">
          {MEAL_TYPES.map(meal => {
            const mealData = day[meal.key]
            if (!mealData) return null
            return (
              <div key={meal.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{meal.emoji}</span>
                  <span className="text-xs font-semibold text-slate-500">{meal.label}</span>
                </div>
                <div className="space-y-1.5 ml-6">
                  {mealData.dishes.map((dish, i) => (
                    <DishItem key={i} name={dish} onRecipe={onRecipe} />
                  ))}
                  {mealData.soup && (
                    <div className="flex items-center gap-2 pt-1 border-t border-rose-50 mt-1.5">
                      <span className="text-xs text-rose-400 font-medium">汤</span>
                      <DishItem name={mealData.soup} onRecipe={onRecipe} isSoup />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DishItem({ name, onRecipe, isSoup = false }) {
  return (
    <button
      onClick={() => onRecipe(name)}
      className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg active:bg-rose-50 group ${isSoup ? '' : 'hover:bg-rose-50'}`}
    >
      <ChefHat size={12} className="text-rose-300 flex-shrink-0 group-hover:text-rose-400" />
      <span className={`text-sm flex-1 ${isSoup ? 'text-rose-500 font-medium' : 'text-slate-600'}`}>{name}</span>
      <BookOpen size={12} className="text-slate-300 group-hover:text-rose-400 flex-shrink-0" />
    </button>
  )
}

function RecipeModal({ recipe, loading, onClose }) {
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
          <LoadingSpinner text="正在查询做法..." />
        </div>
      </div>
    )
  }

  if (recipe.error) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-3xl w-full max-w-[480px] p-6" onClick={e => e.stopPropagation()}>
          <p className="text-center text-slate-500">无法获取做法：{recipe.error}</p>
          <button onClick={onClose} className="mt-4 w-full py-3 bg-rose-50 text-rose-500 rounded-xl">关闭</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-rose-50 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat size={18} className="text-rose-500" />
            <h2 className="font-bold text-slate-800">{recipe.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-rose-50 active:bg-rose-100">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {recipe.servings && <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full">{recipe.servings}</span>}
            {recipe.difficulty && <span className="bg-violet-50 text-violet-600 px-2.5 py-1 rounded-full">{recipe.difficulty}</span>}
            {recipe.time && <span className="bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full">{recipe.time}</span>}
          </div>

          {recipe.nutrients && (
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700 mb-1">营养价值</p>
              <p className="text-sm text-emerald-700">{recipe.nutrients}</p>
            </div>
          )}

          {recipe.ingredients?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">食材</p>
              <div className="space-y-1.5">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-rose-50 last:border-0">
                    <span className="text-sm text-slate-600">{ing.name}</span>
                    <span className="text-sm font-medium text-slate-700">{ing.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipe.steps?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">做法</p>
              <div className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-rose-500">{step.step}</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                      {step.tip && <p className="text-xs text-amber-500 mt-1">💡 {step.tip}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipe.notes && (
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">孕妇注意</p>
              <p className="text-sm text-amber-700">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
