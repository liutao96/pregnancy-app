import { useNavigate } from 'react-router-dom'
import { Feather, Sparkles, ChevronRight, Heart } from 'lucide-react'
import Header from '../components/Header'
import { storage } from '../utils/storage'
import { useEffect, useState } from 'react'

export default function NamingCenter() {
  const navigate = useNavigate()
  const [savedNames, setSavedNames] = useState([])

  useEffect(() => {
    storage.getNames().then(setSavedNames)
  }, [])

  const formalCount = savedNames.filter(n => n.type === 'formal').length
  const nicknameCount = savedNames.filter(n => n.type === 'nickname').length

  return (
    <div className="min-h-screen bg-rose-50 pb-nav">
      <Header title="宝宝起名" />

      <div className="px-4 py-6 space-y-4">
        {/* Intro */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-700 mb-2">
            灵犀·平安喜乐
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            为宝宝构思「平安喜乐」、气质「阳光且从容」的名字。
            追求「暖阳与流水」的结合，传达性格开朗、生活惬意、内心宁静的画面感。
          </p>
        </div>

        {/* Type Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/naming/formal')}
            className="bg-white rounded-2xl p-5 shadow-sm active:bg-rose-50 transition-colors text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <Feather size={22} className="text-amber-500" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">大名</h3>
            <p className="text-xs text-slate-400 mb-3">户籍登记 · 人生名片</p>
            <div className="flex items-center justify-between">
              {formalCount > 0 && (
                <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                  已收藏 {formalCount} 个
                </span>
              )}
              <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-400 transition-colors ml-auto" />
            </div>
          </button>

          <button
            onClick={() => navigate('/naming/nickname')}
            className="bg-white rounded-2xl p-5 shadow-sm active:bg-rose-50 transition-colors text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-3">
              <Sparkles size={22} className="text-pink-500" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">小名</h3>
            <p className="text-xs text-slate-400 mb-3">乳名 · 亲昵称呼</p>
            <div className="flex items-center justify-between">
              {nicknameCount > 0 && (
                <span className="text-xs text-pink-500 bg-pink-50 px-2 py-0.5 rounded-full">
                  已收藏 {nicknameCount} 个
                </span>
              )}
              <ChevronRight size={18} className="text-slate-300 group-hover:text-pink-400 transition-colors ml-auto" />
            </div>
          </button>
        </div>

        {/* Saved Names */}
        {savedNames.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Heart size={16} className="text-rose-400" />
              <h3 className="font-semibold text-slate-700">已收藏的名字</h3>
            </div>
            <div className="space-y-3">
              {savedNames.slice(0, 5).map(name => (
                <div key={name.id} className="flex items-center justify-between py-2 border-b border-rose-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-700">{name.name}</p>
                    <p className="text-xs text-slate-400">
                      {name.type === 'formal' ? '大名' : '小名'}
                      {name.gender && ` · ${name.gender === 'male' ? '男' : '女'}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      storage.deleteName(name.id).then(() => {
                        setSavedNames(prev => prev.filter(n => n.id !== name.id))
                      })
                    }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl p-5">
          <h4 className="font-medium text-slate-700 mb-2">起名小贴士</h4>
          <ul className="text-xs text-slate-500 space-y-1.5">
            <li>• 避免近十年重名率极高的网红字（梓、轩、涵、萱等）</li>
            <li>• 2026年为火马年，可适度包含草、木、禾、水等意象</li>
            <li>• 声调搭配：平仄平或平平仄，朗朗上口</li>
            <li>• 大名小名相互呼应，更具整体感</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
