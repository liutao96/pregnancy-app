import { useState, useEffect } from 'react'
import { Plus, Clock, Droplets, Moon, Baby } from 'lucide-react'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import Header from '../components/Header'
import { storage } from '../utils/storage'

export default function Postpartum() {
  const [settings, setSettings] = useState(null)
  const [postpartum, setPostpartum] = useState({ feedingLogs: [], diaperLogs: [], sleepLogs: [] })
  const [activeTab, setActiveTab] = useState('feeding')
  const [showAddFeeding, setShowAddFeeding] = useState(false)
  const [showAddDiaper, setShowAddDiaper] = useState(false)

  useEffect(() => {
    async function load() {
      const [s, p] = await Promise.all([storage.getSettings(), storage.getPostpartum()])
      setSettings(s)
      setPostpartum(p)
    }
    load()
  }, [])

  async function save(updated) {
    setPostpartum(updated)
    await storage.savePostpartum(updated)
  }

  if (!settings) return null

  // Not born yet
  if (!settings.babyBorn) {
    return (
      <div className="min-h-screen bg-rose-50 pb-nav">
        <Header title="产后护理" />
        <div className="px-4 py-8 text-center">
          <div className="text-5xl mb-4">👶</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">准备迎接宝宝</h2>
          <p className="text-sm text-slate-500 mb-6">宝宝出生后，这里将帮助你记录喂奶、换尿布和睡眠</p>

          <div className="space-y-3 text-left mb-8">
            {PRENATAL_TIPS.map((tip, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-start gap-3">
                <span className="text-lg flex-shrink-0">{tip.icon}</span>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{tip.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={async () => {
              const updated = { ...settings, babyBorn: true, babyBirthDate: new Date().toISOString().split('T')[0] }
              await storage.saveSettings(updated)
              setSettings(updated)
            }}
            className="w-full bg-rose-500 text-white py-4 rounded-2xl font-semibold active:bg-rose-600"
          >
            宝宝出生了！开始记录
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'feeding', icon: Baby, label: '喂奶' },
    { id: 'diaper', icon: Droplets, label: '换尿布' },
    { id: 'sleep', icon: Moon, label: '睡眠' },
    { id: 'tips', icon: Clock, label: '护理指南' },
  ]

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="产后护理" />

      <div className="bg-gradient-to-r from-rose-400 to-pink-400 px-5 py-4 text-white">
        <p className="text-sm opacity-80">宝宝出生 🎉</p>
        <p className="text-lg font-bold mt-0.5">
          {settings.babyBirthDate
            ? `${Math.floor((new Date() - new Date(settings.babyBirthDate)) / (1000 * 60 * 60 * 24))} 天`
            : '记录宝宝成长'}
        </p>
      </div>

      <div className="bg-white border-b border-rose-50 overflow-x-auto scrollbar-hide">
        <div className="flex px-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-400'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'feeding' && (
          <FeedingTab
            logs={postpartum.feedingLogs}
            onAdd={(log) => save({ ...postpartum, feedingLogs: [{ ...log, id: uuidv4() }, ...postpartum.feedingLogs] })}
          />
        )}
        {activeTab === 'diaper' && (
          <DiaperTab
            logs={postpartum.diaperLogs}
            onAdd={(log) => save({ ...postpartum, diaperLogs: [{ ...log, id: uuidv4() }, ...postpartum.diaperLogs] })}
          />
        )}
        {activeTab === 'sleep' && (
          <SleepTab
            logs={postpartum.sleepLogs}
            onAdd={(log) => save({ ...postpartum, sleepLogs: [{ ...log, id: uuidv4() }, ...postpartum.sleepLogs] })}
          />
        )}
        {activeTab === 'tips' && <TipsTab />}
      </div>
    </div>
  )
}

function FeedingTab({ logs, onAdd }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ time: '', type: 'breast', duration: '', notes: '' })

  function handleAdd() {
    onAdd({ ...form, time: form.time || new Date().toISOString() })
    setShowForm(false)
    setForm({ time: '', type: 'breast', duration: '', notes: '' })
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-rose-500 text-white py-3 rounded-2xl font-medium active:bg-rose-600 flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        记录喂奶
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="w-full bg-rose-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            <option value="breast">母乳</option>
            <option value="formula">配方奶</option>
            <option value="mixed">混合喂养</option>
          </select>
          <input
            type="number"
            placeholder="喂奶时长（分钟）"
            value={form.duration}
            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
            className="w-full bg-rose-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none"
          />
          <input
            type="text"
            placeholder="备注（可选）"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            className="w-full bg-rose-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-rose-200 rounded-xl text-rose-500 text-sm">取消</button>
            <button onClick={handleAdd} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium">保存</button>
          </div>
        </div>
      )}

      {logs.slice(0, 20).map(log => (
        <div key={log.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
            🤱
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">
              {log.type === 'breast' ? '母乳' : log.type === 'formula' ? '配方奶' : '混合喂养'}
              {log.duration && ` · ${log.duration}分钟`}
            </p>
            <p className="text-xs text-slate-400">
              {log.time ? new Date(log.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '刚刚'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function DiaperTab({ logs, onAdd }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'wet' })

  function handleAdd() {
    onAdd({ ...form, time: new Date().toISOString() })
    setShowForm(false)
    setForm({ type: 'wet' })
  }

  const typeMap = { wet: '尿湿', dirty: '大便', both: '尿湿+大便' }

  return (
    <div className="space-y-3">
      {!showForm ? (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(typeMap).map(([type, label]) => (
            <button
              key={type}
              onClick={() => { onAdd({ type, time: new Date().toISOString() }) }}
              className="bg-white rounded-2xl p-4 text-center active:bg-rose-50"
            >
              <div className="text-2xl mb-1">{type === 'wet' ? '💧' : type === 'dirty' ? '💩' : '💦'}</div>
              <p className="text-xs font-medium text-slate-600">{label}</p>
            </button>
          ))}
        </div>
      ) : null}

      {logs.slice(0, 20).map(log => (
        <div key={log.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
          <span className="text-xl">{log.type === 'wet' ? '💧' : log.type === 'dirty' ? '💩' : '💦'}</span>
          <div>
            <p className="text-sm font-medium text-slate-700">{typeMap[log.type]}</p>
            <p className="text-xs text-slate-400">
              {new Date(log.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SleepTab({ logs, onAdd }) {
  const [sleeping, setSleeping] = useState(false)
  const [sleepStart, setSleepStart] = useState(null)

  function startSleep() {
    setSleeping(true)
    setSleepStart(new Date())
  }

  function endSleep() {
    const duration = Math.round((new Date() - sleepStart) / 60000)
    onAdd({ start: sleepStart.toISOString(), duration, end: new Date().toISOString() })
    setSleeping(false)
    setSleepStart(null)
  }

  return (
    <div className="space-y-3">
      {!sleeping ? (
        <button
          onClick={startSleep}
          className="w-full bg-violet-500 text-white py-3 rounded-2xl font-medium active:bg-violet-600 flex items-center justify-center gap-2"
        >
          <Moon size={18} />
          宝宝开始睡觉
        </button>
      ) : (
        <div className="bg-violet-50 rounded-2xl p-4 text-center">
          <p className="text-violet-600 font-medium mb-1">宝宝正在睡觉...</p>
          <p className="text-xs text-violet-400 mb-3">
            开始时间：{sleepStart?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            onClick={endSleep}
            className="w-full bg-violet-500 text-white py-3 rounded-xl font-medium active:bg-violet-600"
          >
            宝宝醒了
          </button>
        </div>
      )}

      {logs.slice(0, 10).map(log => (
        <div key={log.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
          <span className="text-xl">😴</span>
          <div>
            <p className="text-sm font-medium text-slate-700">睡眠 {log.duration} 分钟</p>
            <p className="text-xs text-slate-400">
              {new Date(log.start).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TipsTab() {
  return (
    <div className="space-y-3">
      {POSTPARTUM_TIPS.map((tip, i) => (
        <div key={i} className="bg-white rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{tip.icon}</span>
            <div>
              <p className="font-semibold text-slate-700 text-sm mb-1">{tip.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{tip.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const PRENATAL_TIPS = [
  { icon: '🤱', title: '母乳喂养准备', desc: '了解正确的哺乳姿势和哺乳技巧，提前准备乳头保护霜' },
  { icon: '🛏️', title: '安全睡眠环境', desc: '宝宝单独睡婴儿床，仰卧位，床上不放多余物品' },
  { icon: '🧴', title: '脐带护理', desc: '保持脐带残端干燥清洁，通常2-3周自然脱落' },
  { icon: '🩺', title: '产后复查', desc: '产后42天需要妈妈和宝宝同时复查，评估恢复情况' },
  { icon: '💊', title: '新生儿筛查', desc: '出生后需完成多项新生儿疾病筛查和疫苗接种' },
]

const POSTPARTUM_TIPS = [
  { icon: '🤱', title: '按需哺乳', desc: '新生儿应按需哺乳，一般每2-3小时喂一次，每次15-20分钟。注意观察宝宝是否吃饱的信号' },
  { icon: '🧸', title: '脐带护理', desc: '每次换尿布后用酒精棉签擦拭脐带残端，保持干燥，避免弄湿' },
  { icon: '🛁', title: '新生儿洗澡', desc: '水温38-40度，室温26-28度，洗澡时间控制在5-10分钟内' },
  { icon: '💤', title: '睡眠安全', desc: '仰卧位睡觉最安全，不要俯卧，床上不放枕头和被子' },
  { icon: '👩‍⚕️', title: '妈妈恢复', desc: '产后注意休息，避免过早负重，适当补充营养，关注产后情绪变化' },
  { icon: '💉', title: '疫苗时间表', desc: '出生24小时内：乙肝疫苗、卡介苗；满月：乙肝疫苗第二针；2月：脊髓灰质炎疫苗' },
]
