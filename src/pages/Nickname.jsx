import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Heart, RefreshCw, Check } from 'lucide-react'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { generateNickname } from '../utils/ai'
import { storage } from '../utils/storage'

export default function Nickname() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [formData, setFormData] = useState({
    gender: 'unknown',
    style: '亲切可爱',
    formalName: '',
  })
  const [savedIds, setSavedIds] = useState(new Set())

  const handleGenerate = async () => {
    setLoading(true)
    setResults(null)
    try {
      const data = await generateNickname(formData)
      setResults(data.nicknames || [])
    } catch (e) {
      console.error('生成失败:', e)
      alert('生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (nicknameData) => {
    await storage.saveName({
      type: 'nickname',
      name: nicknameData.name,
      gender: formData.gender,
      source: nicknameData,
    })
    setSavedIds(prev => new Set([...prev, nicknameData.name]))
  }

  const easeColor = (score) => {
    if (score >= 8) return 'text-emerald-500 bg-emerald-50'
    if (score >= 6) return 'text-amber-500 bg-amber-50'
    return 'text-slate-500 bg-slate-50'
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header
        title="小名"
        left={
          <button onClick={() => navigate('/naming')} className="p-1.5 -ml-1.5">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">小名偏好</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">宝宝性别</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'male', label: '男宝宝' },
                  { value: 'female', label: '女宝宝' },
                  { value: 'unknown', label: '未知' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFormData(p => ({ ...p, gender: opt.value }))}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      formData.gender === opt.value
                        ? 'bg-pink-400 text-white'
                        : 'bg-rose-50 text-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">风格偏好</label>
              <select
                value={formData.style}
                onChange={e => setFormData(p => ({ ...p, style: e.target.value }))}
                className="w-full px-3 py-2.5 bg-rose-50 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 appearance-none"
              >
                <option>亲切可爱</option>
                <option>俏皮灵动</option>
                <option>温暖治愈</option>
                <option>自然清新</option>
                <option>洋气独特</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">大名参考（可选）</label>
              <input
                type="text"
                value={formData.formalName}
                onChange={e => setFormData(p => ({ ...p, formalName: e.target.value }))}
                placeholder="输入大名，小名可与之呼应"
                className="w-full px-3 py-2.5 bg-rose-50 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full mt-5 py-3.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                构思中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                开始构思小名
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <LoadingSpinner />
            <p className="text-sm text-slate-500 mt-3">正在为宝宝精心构思小名...</p>
            <p className="text-xs text-slate-400 mt-1">温馨可爱 · 琅琅上口</p>
          </div>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">推荐小名</h3>
              <button
                onClick={handleGenerate}
                className="text-xs text-pink-500 flex items-center gap-1"
              >
                <RefreshCw size={12} />
                换一批
              </button>
            </div>

            {results.map((nicknameData, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-800">{nicknameData.name}</h4>
                    <p className="text-sm text-pink-400 mt-0.5">{nicknameData.feeling}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${easeColor(nicknameData.ease)}`}>
                    上口度 {nicknameData.ease}/10
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">来源</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{nicknameData.source}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">画面感</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{nicknameData.visual}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSave(nicknameData)}
                  disabled={savedIds.has(nicknameData.name)}
                  className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    savedIds.has(nicknameData.name)
                      ? 'bg-emerald-50 text-emerald-500'
                      : 'bg-pink-50 text-pink-500 hover:bg-pink-100'
                  }`}
                >
                  {savedIds.has(nicknameData.name) ? (
                    <>
                      <Check size={16} />
                      已收藏
                    </>
                  ) : (
                    <>
                      <Heart size={16} />
                      收藏此小名
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {results && results.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-sm text-slate-500">未能生成小名，请重试</p>
          </div>
        )}
      </div>
    </div>
  )
}
