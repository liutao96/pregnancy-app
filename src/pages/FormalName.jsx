import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Heart, Share2, RefreshCw, Check } from 'lucide-react'
import Header from '../components/Header'
import LoadingSpinner from '../components/LoadingSpinner'
import { generateFormalName } from '../utils/ai'
import { storage } from '../utils/storage'

export default function FormalName() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [formData, setFormData] = useState({
    fatherSurname: '刘',
    motherSurname: '谢',
    gender: 'unknown',
    style: '平安喜乐·阳光从容',
  })
  const [savedIds, setSavedIds] = useState(new Set())

  const handleGenerate = async () => {
    setLoading(true)
    setResults(null)
    try {
      const data = await generateFormalName(formData)
      setResults(data.names || [])
    } catch (e) {
      console.error('生成失败:', e)
      alert('生成失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (nameData) => {
    await storage.saveName({
      type: 'formal',
      name: nameData.name,
      gender: formData.gender,
      source: nameData,
    })
    setSavedIds(prev => new Set([...prev, nameData.name]))
  }

  const uniquenessLabel = (score) => {
    if (score >= 9) return '极高独特'
    if (score >= 7) return '较高独特'
    return '一般'
  }

  const uniquenessColor = (score) => {
    if (score >= 9) return 'text-emerald-500 bg-emerald-50'
    if (score >= 7) return 'text-amber-500 bg-amber-50'
    return 'text-slate-500 bg-slate-50'
  }

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header
        title="大名"
        left={
          <button onClick={() => navigate('/naming')} className="p-1.5 -ml-1.5">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Form */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">家族信息</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">父姓</label>
                <input
                  type="text"
                  value={formData.fatherSurname}
                  onChange={e => setFormData(p => ({ ...p, fatherSurname: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-rose-50 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">母姓</label>
                <input
                  type="text"
                  value={formData.motherSurname}
                  onChange={e => setFormData(p => ({ ...p, motherSurname: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-rose-50 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  maxLength={2}
                />
              </div>
            </div>

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
                        ? 'bg-amber-400 text-white'
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
                <option>平安喜乐·阳光从容</option>
                <option>温润如玉·书卷气质</option>
                <option>大气磅礴·格局开阔</option>
                <option>清新自然·诗意盎然</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full mt-5 py-3.5 bg-gradient-to-r from-amber-400 to-rose-400 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                构思中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                开始构思大名
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <LoadingSpinner />
            <p className="text-sm text-slate-500 mt-3">正在为宝宝精心构思名字...</p>
            <p className="text-xs text-slate-400 mt-1">追求独特与美感的完美结合</p>
          </div>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">推荐名字</h3>
              <button
                onClick={handleGenerate}
                className="text-xs text-amber-500 flex items-center gap-1"
              >
                <RefreshCw size={12} />
                换一批
              </button>
            </div>

            {results.map((nameData, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-800">{nameData.name}</h4>
                    <p className="text-sm text-slate-400 mt-0.5">{nameData.pinyin}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${uniquenessColor(nameData.uniqueness)}`}>
                      独特度 {nameData.uniqueness}/10
                    </span>
                    {nameData.elements?.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
                        {nameData.elements.join('')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">意蕴溯源</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{nameData.meaning}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">画面审美</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{nameData.visual}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">平安喜乐解析</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{nameData.peaceJoy}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">声韵分析</span>
                    <p className="text-slate-600 mt-1 leading-relaxed">{nameData.phonetics}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSave(nameData)}
                  disabled={savedIds.has(nameData.name)}
                  className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    savedIds.has(nameData.name)
                      ? 'bg-emerald-50 text-emerald-500'
                      : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                  }`}
                >
                  {savedIds.has(nameData.name) ? (
                    <>
                      <Check size={16} />
                      已收藏
                    </>
                  ) : (
                    <>
                      <Heart size={16} />
                      收藏此名字
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {results && results.length === 0 && !loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <p className="text-sm text-slate-500">未能生成名字，请重试</p>
          </div>
        )}
      </div>
    </div>
  )
}
