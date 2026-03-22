import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isMonday } from 'date-fns'
import { ClipboardList, BookOpen, MessageCircle, ShoppingBag, Heart, ChevronRight, Bell, Utensils } from 'lucide-react'
import { storage } from '../utils/storage'
import {
  getCurrentWeek, getCurrentDay, getDaysUntilDue,
  getBabySize, getNextCheckup, getTrimesterLabel
} from '../utils/pregnancyCalc'

const GREETINGS = ['早上好', '上午好', '中午好', '下午好', '晚上好']
function getGreeting() {
  const h = new Date().getHours()
  if (h < 9) return GREETINGS[0]
  if (h < 11) return GREETINGS[1]
  if (h < 13) return GREETINGS[2]
  if (h < 18) return GREETINGS[3]
  return GREETINGS[4]
}

export default function Dashboard() {
  const [settings, setSettings] = useState(null)
  const [checkups, setCheckups] = useState([])
  const [currentWeek, setCurrentWeek] = useState(19)
  const [daysLeft, setDaysLeft] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const s = await storage.getSettings()
      const c = await storage.getCheckups()
      setSettings(s)
      setCheckups(c)

      // Calculate current week (B超 override takes priority over LMP calculation)
      const week = getCurrentWeek(s.dueDate, new Date(), s)
      setCurrentWeek(week)
      setDaysLeft(getDaysUntilDue(s.dueDate))
    }
    load()
  }, [])

  if (!settings) return null

  const babySize = getBabySize(currentWeek)
  const nextCheckup = getNextCheckup(currentWeek)
  const latestCheckup = checkups[0]
  const currentDay = getCurrentDay(settings.dueDate)
  const trimesterLabel = getTrimesterLabel(currentWeek)
  const progress = Math.round((currentWeek / 40) * 100)

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      {/* Top banner */}
      <div className="bg-gradient-to-br from-rose-400 via-rose-500 to-pink-500 text-white px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-1">
          <p className="text-rose-100 text-sm">{getGreeting()}，{settings.dadName}</p>
          <button onClick={() => navigate('/settings')} className="p-1 rounded-full bg-white/20 active:bg-white/30">
            <Heart size={16} />
          </button>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">第 {currentWeek} 周</h1>
            <p className="text-rose-100 text-sm mt-0.5">第 {currentDay} 天 · {trimesterLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{daysLeft}</p>
            <p className="text-rose-100 text-xs">距预产期（天）</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-rose-100 mb-1.5">
            <span>孕{currentWeek}周</span>
            <span>{progress}%</span>
            <span>预产期</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-rose-200 mt-1">
            <span>0周</span>
            <span>40周</span>
          </div>
        </div>
      </div>

      {/* Baby size card */}
      <div className="mx-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
            {babySize.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">本周宝宝大小</p>
            <p className="font-semibold text-slate-800">{babySize.name}</p>
            <p className="text-xs text-slate-500">{babySize.size}</p>
          </div>
          <button
            onClick={() => navigate('/weekly')}
            className="text-rose-400 flex-shrink-0"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Monday checkup reminder */}
      {settings.weeklyCheckupReminder && isMonday(new Date()) && (
        <div className="mx-4 -mt-4">
          <div
            className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-white cursor-pointer active:opacity-90"
            onClick={() => navigate('/checkups/new')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">今天是周一 · 产检日</p>
                <p className="text-xs opacity-80 mt-0.5">别忘了记录本周产检情况</p>
              </div>
              <ChevronRight size={20} className="opacity-70" />
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={<BookOpen size={20} />}
            title="本周指南"
            desc="发育・饮食・提示"
            color="bg-violet-50 text-violet-500"
            onClick={() => navigate('/weekly')}
          />
          <QuickAction
            icon={<MessageCircle size={20} />}
            title="问答助手"
            desc="随时解答疑问"
            color="bg-sky-50 text-sky-500"
            onClick={() => navigate('/qa')}
          />
          <QuickAction
            icon={<ClipboardList size={20} />}
            title="孕检档案"
            desc="上传 · 解析 · 对比"
            color="bg-emerald-50 text-emerald-500"
            onClick={() => navigate('/checkups')}
          />
          <QuickAction
            icon={<Utensils size={20} />}
            title="本周食谱"
            desc="每天3餐3菜1汤"
            color="bg-orange-50 text-orange-500"
            onClick={() => navigate('/meal')}
          />
        </div>

        {/* Meal plan banner */}
        <div
          className="bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl p-4 text-white cursor-pointer active:opacity-90"
          onClick={() => navigate('/meal')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">AI定制食谱</p>
              <p className="font-semibold text-base mt-0.5">每天3菜1汤 · 营养不重样</p>
            </div>
            <ChevronRight size={20} className="opacity-70" />
          </div>
        </div>

        {/* Next checkup reminder */}
        {nextCheckup && (
          <div
            className="bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:bg-rose-50"
            onClick={() => navigate('/checkups')}
          >
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bell size={18} className="text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400">下一个重要产检</p>
              <p className="font-semibold text-slate-800 text-sm">{nextCheckup.name}</p>
              <p className="text-xs text-slate-500 truncate">{nextCheckup.desc}</p>
            </div>
            <span className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded-lg font-medium flex-shrink-0">
              第{nextCheckup.week}周
            </span>
          </div>
        )}

        {/* Latest checkup */}
        {latestCheckup && (
          <div
            className="bg-white rounded-2xl p-4 cursor-pointer active:bg-rose-50"
            onClick={() => navigate(`/checkups/${latestCheckup.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">最近一次产检</p>
              <p className="text-xs text-rose-400">{latestCheckup.date}</p>
            </div>
            <p className="font-semibold text-slate-800">{latestCheckup.type || '常规产检'}</p>
            <p className="text-xs text-slate-500 mt-0.5">孕{latestCheckup.week}周 · {latestCheckup.hospital || '未填写医院'}</p>
            {latestCheckup.reports?.length > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                  {latestCheckup.reports.length} 份报告已解析
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pre-delivery / Postpartum link */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="bg-white rounded-2xl p-4 cursor-pointer active:bg-rose-50"
            onClick={() => navigate('/preparation')}
          >
            <div className="text-2xl mb-1">🎒</div>
            <p className="font-semibold text-slate-800 text-sm">待产准备</p>
            <p className="text-xs text-slate-500 mt-0.5">待产包清单</p>
          </div>
          <div
            className="bg-white rounded-2xl p-4 cursor-pointer active:bg-rose-50"
            onClick={() => navigate('/postpartum')}
          >
            <div className="text-2xl mb-1">👶</div>
            <p className="font-semibold text-slate-800 text-sm">产后护理</p>
            <p className="text-xs text-slate-500 mt-0.5">宝宝 · 妈妈</p>
          </div>
        </div>

        {/* Due date display */}
        <div className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-400">预产期</p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {format(new Date(settings.dueDate), 'yyyy年M月d日')}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">与宝宝相遇还有 {daysLeft} 天</p>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, title, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-4 text-left active:scale-95 transition-transform w-full"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        {icon}
      </div>
      <p className="font-semibold text-slate-800 text-sm">{title}</p>
      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
    </button>
  )
}
