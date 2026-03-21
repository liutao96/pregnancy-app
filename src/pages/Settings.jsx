import { useState, useEffect } from 'react'
import { X, Plus, AlertTriangle } from 'lucide-react'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { getDaysUntilDue } from '../utils/pregnancyCalc'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [exclusions, setExclusions] = useState({ dislikes: [], taboo: [] })
  const [saved, setSaved] = useState(false)
  const [newDislike, setNewDislike] = useState('')
  const [newTaboo, setNewTaboo] = useState('')

  useEffect(() => {
    async function load() {
      const [s, ex] = await Promise.all([
        storage.getSettings(),
        storage.getFoodExclusions(),
      ])
      setSettings(s)
      setExclusions(ex)
    }
    load()
  }, [])

  function updateSetting(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  async function save() {
    await storage.saveSettings(settings)
    await storage.saveFoodExclusions(exclusions)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addDislike() {
    const val = newDislike.trim()
    if (!val || exclusions.dislikes.includes(val)) return
    setExclusions(e => ({ ...e, dislikes: [...e.dislikes, val] }))
    setNewDislike('')
  }

  function addTaboo() {
    const val = newTaboo.trim()
    if (!val || exclusions.taboo.includes(val)) return
    setExclusions(e => ({ ...e, taboo: [...e.taboo, val] }))
    setNewTaboo('')
  }

  function removeDislike(item) {
    setExclusions(e => ({ ...e, dislikes: e.dislikes.filter(d => d !== item) }))
  }

  function removeTaboo(item) {
    setExclusions(e => ({ ...e, taboo: e.taboo.filter(t => t !== item) }))
  }

  if (!settings) return null

  const daysLeft = getDaysUntilDue(settings.dueDate)

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="应用设置" />

      <div className="px-4 py-4 space-y-4">
        {/* Due date */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-slate-700">孕期信息</p>

          <Field label="预产期">
            <input
              type="date"
              value={settings.dueDate}
              onChange={e => updateSetting('dueDate', e.target.value)}
              className="input-field"
            />
            <p className="text-xs text-slate-400 mt-1">
              距预产期还有 <strong className="text-rose-500">{daysLeft}</strong> 天
            </p>
          </Field>

          <Field label="宝宝昵称">
            <input
              type="text"
              value={settings.babyNickname}
              onChange={e => updateSetting('babyNickname', e.target.value)}
              placeholder="例：小花生"
              className="input-field"
            />
          </Field>
        </div>

        {/* Family info */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-slate-700">家庭成员</p>

          <Field label="妈妈的称呼">
            <input
              type="text"
              value={settings.momName}
              onChange={e => updateSetting('momName', e.target.value)}
              placeholder="例：宝妈、妈妈"
              className="input-field"
            />
          </Field>

          <Field label="爸爸的称呼">
            <input
              type="text"
              value={settings.dadName}
              onChange={e => updateSetting('dadName', e.target.value)}
              placeholder="例：准爸爸、爸爸"
              className="input-field"
            />
          </Field>
        </div>

        {/* Food exclusions */}
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-slate-700">饮食偏好</p>
          <p className="text-xs text-slate-400 -mt-1">设置后，食谱推荐会自动避开这些食物</p>

          {/* Dislikes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-600">我不想吃</span>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">家常偏好</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newDislike}
                onChange={e => setNewDislike(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDislike()}
                placeholder="例如：香菜、胡萝卜..."
                className="input-field flex-1"
              />
              <button
                onClick={addDislike}
                className="px-3 py-2 bg-rose-50 text-rose-500 rounded-xl active:bg-rose-100 flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exclusions.dislikes.map(item => (
                <span key={item} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-sm">
                  {item}
                  <button onClick={() => removeDislike(item)} className="text-slate-400 active:text-rose-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {exclusions.dislikes.length === 0 && (
                <p className="text-xs text-slate-300 italic">暂未添加</p>
              )}
            </div>
          </div>

          {/* Taboo */}
          <div className="pt-3 border-t border-rose-50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-sm font-medium text-slate-600">孕期忌口</span>
              <span className="text-xs text-red-400 bg-red-50 px-1.5 py-0.5 rounded">绝不含这些</span>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTaboo}
                onChange={e => setNewTaboo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTaboo()}
                placeholder="例如：生鱼片、腊肉..."
                className="input-field flex-1"
              />
              <button
                onClick={addTaboo}
                className="px-3 py-2 bg-red-50 text-red-400 rounded-xl active:bg-red-100 flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {exclusions.taboo.map(item => (
                <span key={item} className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-sm">
                  {item}
                  <button onClick={() => removeTaboo(item)} className="text-red-300 active:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {exclusions.taboo.length === 0 && (
                <p className="text-xs text-slate-300 italic">暂未添加</p>
              )}
            </div>
          </div>
        </div>

        {/* Baby born status */}
        <div className="bg-white rounded-2xl p-4">
          <p className="font-semibold text-slate-700 mb-3">宝宝状态</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">宝宝已经出生</p>
              <p className="text-xs text-slate-400">开启后可使用产后记录功能</p>
            </div>
            <button
              onClick={() => updateSetting('babyBorn', !settings.babyBorn)}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.babyBorn ? 'bg-rose-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.babyBorn ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {settings.babyBorn && (
            <div className="mt-3">
              <Field label="出生日期">
                <input
                  type="date"
                  value={settings.babyBirthDate || ''}
                  onChange={e => updateSetting('babyBirthDate', e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>
          )}
        </div>

        <button
          onClick={save}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-colors ${
            saved ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white active:bg-rose-600'
          }`}
        >
          {saved ? '已保存 ✓' : '保存设置'}
        </button>

        <div className="text-center py-2">
          <p className="text-xs text-slate-300">所有数据仅保存在你的设备上，不会上传到任何服务器</p>
        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          background: #fff1f2;
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          color: #1e293b;
          outline: none;
        }
        .input-field:focus {
          box-shadow: 0 0 0 2px #fda4af;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
